import pool from '../config/db.js';
import { generateDeepDiveReport } from '../services/ai.service.js';

/*
- Fleet Size
- Returns the total number of trucks seen in the database
- Metrics for Utilization.
 */

const FLEET_CONFIG = {
    TOTAL: 90,
    HOWO: 30,
    IVECO: 23,
    MACK: 25,
    'MAN TGA': 12
};

export const getTotalFleetSize = async () => {
    const [rows] = await pool.query('SELECT COUNT(DISTINCT truck_number) as total FROM trips');
    return rows[0].total || 0;
};

/*
 - Getting the Weekly Summary
 - Aggregations for a single week (defined by week_start_date)
 */
export const getWeeklySummary = async (weekStartDate) => {
    const totalFleet = await getTotalFleetSize();

    const sql = `
        SELECT 
            COUNT(*) as total_trips,
            -- IT vs Non-IT Trip Counts
            SUM(CASE WHEN trip_category = 'IT' THEN 1 ELSE 0 END) as it_trips,
            SUM(CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN 1 ELSE 0 END) as non_it_trips,
            
            SUM(profit) as total_profit,
            -- IT vs Non-IT Profit
            SUM(CASE WHEN trip_category = 'IT' THEN profit ELSE 0 END) as it_profit,
            SUM(CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN profit ELSE 0 END) as non_it_profit,
            
            AVG(profit) as avg_profit_per_trip,
            COUNT(DISTINCT truck_number) as active_trucks,
            SUM(road_expenses) as total_expenses,
            SUM(maintenance) as total_maintenance
        FROM trips 
        WHERE week_start_date = ?
    `;

    const [rows] = await pool.query(sql, [weekStartDate]);
    const data = rows[0];

    return {
        ...data,
        utilization_rate: totalFleet > 0 ? ((data.active_trucks / totalFleet) * 100).toFixed(1) : 0,
        avg_trips_per_truck: data.active_trucks > 0 ? (data.total_trips / data.active_trucks).toFixed(1) : 0,
        total_fleet: totalFleet
    };
};

/*
 -Trends (Multi-Week)
 - Returns metrics for the past weeks for charts.
 */
export const getTrends = async (limit = 4) => {
    const totalFleet = 90; // Using your hardcoded fleet config

    const sql = `
        SELECT 
            uploaded_week as week,
            -- Non-IT Trip Volume
            SUM(CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN 1 ELSE 0 END) as non_it_trips,
            -- Total Trips (including IT)
            COUNT(*) as total_trips,
            -- Net Profit (Revenue/Profit column - Maintenance)
            SUM(profit - maintenance) as net_profit,
            -- Total Active Trucks (The denominator for T/T)
            COUNT(DISTINCT truck_number) as active_trucks
        FROM trips
        WHERE uploaded_week IS NOT NULL
        GROUP BY uploaded_week
        ORDER BY CAST(REGEXP_REPLACE(uploaded_week, '[^0-9]', '') AS UNSIGNED) DESC
        LIMIT ?
    `;

    const [rows] = await pool.query(sql, [limit]);

    return rows.map(row => {
        const nonItTrips = parseFloat(row.non_it_trips || 0);
        const activeTrucks = parseFloat(row.active_trucks || 0);
        
        return {
            week: row.week,
            trips: nonItTrips, // Using non-it trips for the "Volume" metric as per your request
            profit: parseFloat(row.net_profit || 0),
            active_trucks: activeTrucks,
            // T/T Calculation: Non-IT Trips divided by Active Trucks
            efficiency: activeTrucks > 0 ? (nonItTrips / activeTrucks).toFixed(1) : "0.0"
        };
    }).reverse(); // Reverse so it displays Week 1 -> Week 4 in the table
};

/*
Fleet Managers Ranking
 */
export const getManagerRankings = async (weekStartDate) => {
    const sql = `
        SELECT 
            fleet_manager,
            COUNT(*) as total_trips,
            COUNT(DISTINCT truck_number) as active_trucks,
            SUM(profit) as total_profit,
            AVG(profit) as avg_profit_per_trip
        FROM trips
        WHERE week_start_date = ?
        GROUP BY fleet_manager
        ORDER BY total_profit DESC
    `;

    const [rows] = await pool.query(sql, [weekStartDate]);
    
    return rows.map(mgr => ({
        ...mgr,
        trips_per_truck: mgr.active_trucks > 0 ? (mgr.total_trips / mgr.active_trucks).toFixed(1) : 0
    }));
};

//To find which trucks cost the most to maintain.
export const getBrandStats = async (startDate, endDate) => {
    const sql = `
        SELECT 
            brand,
            COUNT(*) as trip_count,
            SUM(maintenance) as total_maintenance,
            SUM(profit) as total_profit
        FROM trips
        WHERE trip_date BETWEEN ? AND ? 
        AND brand IS NOT NULL 
        AND brand != ''
        GROUP BY brand
    `;
    const [rows] = await pool.query(sql, [startDate, endDate]);
    return rows;
};

//Comparison between the profitabkle routes and the less profitable ones. 
export const getRouteStats = async (startDate, endDate) => {
    const sql = `
        SELECT 
            CONCAT(origin, ' ➝ ', destination) as route_name,
            COUNT(*) as trip_count,
            SUM(profit) as total_profit,
            AVG(profit) as avg_profit
        FROM trips
        WHERE trip_date BETWEEN ? AND ?
        GROUP BY origin, destination
        ORDER BY total_profit DESC
    `;
    const [rows] = await pool.query(sql, [startDate, endDate]);
    return rows;
};

// Get Summary for any Date Range
export const getRangeSummary = async (startDate, endDate) => {
    const totalFleet = await getTotalFleetSize();

    const sql = `
        SELECT 
            COUNT(*) as total_trips,
            SUM(CASE WHEN trip_category = 'IT' THEN 1 ELSE 0 END) as it_trips,
            SUM(CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN 1 ELSE 0 END) as non_it_trips,
            
            SUM(profit) as total_profit,
            SUM(CASE WHEN trip_category = 'IT' THEN profit ELSE 0 END) as it_profit,
            SUM(CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN profit ELSE 0 END) as non_it_profit,
            
            AVG(profit) as avg_profit_per_trip,
            COUNT(DISTINCT truck_number) as active_trucks,
            SUM(road_expenses + dispatch + fuel_cost) as total_expenses,
            SUM(maintenance) as total_maintenance
        FROM trips
        WHERE trip_date BETWEEN ? AND ?
    `;

    const [rows] = await pool.query(sql, [startDate, endDate]);
    const data = rows[0];

    return {
        ...data,
        utilization_rate: totalFleet > 0 ? ((data.active_trucks / totalFleet) * 100).toFixed(1) : 0,
        avg_trips_per_truck: data.active_trucks > 0 ? (data.total_trips / data.active_trucks).toFixed(1) : 0,
        total_fleet: totalFleet
    };
};


 //Get Trends grouped by Day, Week, or Month
export const getRangeTrends = async (startDate, endDate, intervalFormat) => {
    const sql = `
        SELECT 
            DATE_FORMAT(trip_date, ?) as label,
            COUNT(*) as total_trips,
            SUM(profit) as total_profit
        FROM trips
        WHERE trip_date BETWEEN ? AND ?
        GROUP BY label
        ORDER BY label ASC
    `;

    const [rows] = await pool.query(sql, [intervalFormat, startDate, endDate]);
    return rows;
};

//Top Managers for Date Range
export const getRangeManagers = async (startDate, endDate) => {
    const sql = `
        SELECT 
            fleet_manager as name,
            COUNT(*) as trips,
            COUNT(DISTINCT truck_number) as active_trucks,
            SUM(profit) as profit,
            -- Calculate efficiency directly in SQL
            ROUND(COUNT(*) / COUNT(DISTINCT truck_number), 1) as efficiency
        FROM trips
        WHERE trip_date BETWEEN ? AND ?
        GROUP BY fleet_manager
        ORDER BY profit DESC
    `;
    const [rows] = await pool.query(sql, [startDate, endDate]);
    return rows;
};

//Top Performing Trucks
export const getTopTrucks = async (startDate, endDate) => {
    const sql = `
        SELECT 
            truck_number as id,
            MAX(brand) as brand, 
            MAX(driver_name) as driver,
            COALESCE(MAX(fleet_manager), 'Not Assigned') as fm, 
            SUM(profit) as profit,
            COUNT(*) as trips
        FROM trips
        WHERE trip_date BETWEEN ? AND ?
        GROUP BY truck_number
        /* Combined into a single ORDER BY. 
           This sorts by highest profit, then by most trips */
        ORDER BY profit DESC, trips DESC
        LIMIT 10
    `;
    try {
        const [rows] = await pool.query(sql, [startDate, endDate]);
        return rows;
    } catch (error) {
        console.error("Error in getTopTrucks SQL:", error);
        return [];
    }
};
//Top Performing Brands
export const getTopBrands = async (startDate, endDate) => {
    const query = `
        SELECT 
            brand AS name, 
            COUNT(*) AS trips, 
            SUM(profit) AS total_profit,
            COUNT(DISTINCT truck_number) AS active_trucks
        FROM trips
        WHERE trip_date BETWEEN ? AND ?
        GROUP BY brand
        ORDER BY total_profit DESC
    `;
    const [rows] = await pool.query(query, [startDate, endDate]);
    return rows;
};

//Report Page
export const getFullReportData = async (startDate, endDate) => {
    try {
        const sql = `
            SELECT 
                trip_date, 
                truck_number, 
                driver_name, 
                brand, 
                fleet_manager, 
                trip_rate as revenue, 
                (road_expenses + fuel_cost + maintenance) as expense, 
                profit
            FROM trips
            WHERE trip_date BETWEEN ? AND ?
            ORDER BY trip_date DESC
        `;
        
        const [rows] = await pool.query(sql, [startDate, endDate]);
        return rows;
    } catch (error) {
        console.error("SQL Error Detail:", error.message);
        throw error;
    }
};

export const getWeeklyReportMetrics = async (startDate, endDate, absoluteWeek = null) => {
    const formatDate = (d) => new Date(d).toISOString().split('T')[0];
    const s = formatDate(startDate);
    const e = formatDate(endDate);

    try {
        const [
            currRes, prevRes, trendRes, brandRes, truckInsightRes, managerRes,
            topVolumeRes, topNonItProfitRes, topItProfitRes,
            fmPrevRes, allTrucksProfit, financialPrevRes, fmPrevTrucksRes,
            brandTrendRes,
            negativeProfitRes
        ] = await Promise.all([
            // Current Week General Summary

pool.query(`SELECT COUNT(*) as total_trips, 
            SUM(CASE WHEN trip_category = 'IT' THEN 1 ELSE 0 END) as it_trips, 
            SUM(CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN 1 ELSE 0 END) as non_it_trips, 
            COUNT(DISTINCT truck_number) as total_active_trucks, 
            -- ADD THIS LINE BELOW:
            COUNT(DISTINCT CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN truck_number END) as active_trucks_non_it,
            SUM(profit) as gross_profit_val, 
            SUM(maintenance) as total_maint FROM trips WHERE trip_date BETWEEN ? AND ?`, [s, e]),
            // Previous Week Brand (Historical)
            pool.query(`SELECT brand, COUNT(*) as trips FROM trips WHERE trip_date BETWEEN DATE_SUB(?, INTERVAL 7 DAY) AND DATE_SUB(?, INTERVAL 7 DAY) GROUP BY brand`, [s, e]),
            
            // Trend Analysis
            pool.query(`SELECT week_start_date, COUNT(CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN 1 END) as revenue_trips, COUNT(DISTINCT CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN truck_number END) as revenue_trucks, SUM(profit - maintenance) as total_net_profit FROM trips WHERE week_start_date <= (SELECT week_start_date FROM trips WHERE trip_date = ? LIMIT 1) GROUP BY week_start_date ORDER BY week_start_date DESC LIMIT 4`, [s]),
            
            //  Current Brand Stats (MODIFIED: Active trucks strictly based on Non-IT involvement)
            pool.query(`
                SELECT 
                    brand as name, 
                    COUNT(DISTINCT CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN truck_number END) as active_trucks, 
                    SUM(CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN 1 ELSE 0 END) as revenue_trips,
                    COUNT(*) as total_trips 
                FROM trips 
                WHERE trip_date BETWEEN ? AND ? 
                GROUP BY brand`, [s, e]),
            
            //  Truck Deployment Logic
            pool.query(`SELECT 
                        COUNT(DISTINCT CASE WHEN did_revenue = 1 AND did_it = 0 THEN truck_number END) as onlyRevenue,
                        COUNT(DISTINCT CASE WHEN did_revenue = 0 AND did_it = 1 THEN truck_number END) as onlyIT,
                        COUNT(DISTINCT CASE WHEN did_revenue = 1 AND did_it = 1 THEN truck_number END) as doubleDuty
                        FROM (
                            SELECT truck_number, 
                            MAX(CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN 1 ELSE 0 END) as did_revenue, 
                            MAX(CASE WHEN trip_category = 'IT' THEN 1 ELSE 0 END) as did_it 
                            FROM trips WHERE trip_date BETWEEN ? AND ? GROUP BY truck_number
                        ) as deployment_stats`, [s, e]),
             // Fleet Manager Logic 
pool.query(`
    SELECT 
        UPPER(TRIM(main.fleet_manager)) as name,
        -- 1. Total Non-IT/Revenue trips
        SUM(CASE WHEN main.trip_category != 'IT' OR main.trip_category IS NULL THEN 1 ELSE 0 END) as trips,
        
        -- 2. Total Active Trucks: Display value (Total assigned fleet)
        COUNT(DISTINCT main.truck_number) as active_trucks,
        
        -- 3. Revenue-Active Trucks: Calculation value (Only those who did Non-IT)
        COUNT(DISTINCT CASE WHEN main.trip_category != 'IT' OR main.trip_category IS NULL THEN main.truck_number END) as revenue_trucks,
        
        -- 4. Net Profit
        SUM(main.profit - main.maintenance) as profit,
        
        GROUP_CONCAT(DISTINCT main.brand SEPARATOR ' AND ') as manager_brands,
        
        -- 5. Target Met: Unique count of trucks hitting 3+ trips
        COUNT(DISTINCT CASE WHEN target.is_met = 1 THEN main.truck_number END) as trucks_met_target

    FROM trips main
    LEFT JOIN (
        SELECT 
            UPPER(TRIM(fleet_manager)) as fm_key, 
            truck_number, 
            1 as is_met
        FROM trips
        WHERE (trip_category != 'IT' OR trip_category IS NULL)
          AND trip_date BETWEEN ? AND ?
        GROUP BY UPPER(TRIM(fleet_manager)), truck_number
        HAVING COUNT(*) >= 3
    ) AS target ON UPPER(TRIM(main.fleet_manager)) = target.fm_key 
               AND main.truck_number = target.truck_number

    WHERE main.trip_date BETWEEN ? AND ?
    GROUP BY UPPER(TRIM(main.fleet_manager))
    ORDER BY profit DESC
`, [s, e, s, e]),

            //  Supporting Data Queries
            pool.query(`SELECT truck_number as id, MAX(driver_name) as driver, MAX(brand) as brand, MAX(fleet_manager) as fm, COUNT(*) as trips, SUM(CASE WHEN trip_category = 'IT' THEN 1 ELSE 0 END) as it_trips, SUM(profit) as profit FROM trips WHERE trip_date BETWEEN ? AND ? GROUP BY truck_number ORDER BY trips DESC LIMIT 10`, [s, e]),
            pool.query(`SELECT truck_number as id, MAX(brand) as brand, MAX(fleet_manager) as fm, COUNT(*) as trips, SUM(CASE WHEN trip_category = 'IT' THEN 1 ELSE 0 END) as it_trips, SUM(profit) as profit FROM trips WHERE trip_date BETWEEN ? AND ? AND (trip_category != 'IT' OR trip_category IS NULL) GROUP BY truck_number ORDER BY profit DESC LIMIT 10`, [s, e]),
            pool.query(`SELECT truck_number as id, MAX(brand) as brand, MAX(fleet_manager) as fm, COUNT(*) as trips, SUM(CASE WHEN trip_category = 'IT' THEN 1 ELSE 0 END) as it_trips, SUM(profit) as profit FROM trips WHERE trip_date BETWEEN ? AND ? AND trip_category = 'IT' GROUP BY truck_number ORDER BY profit DESC LIMIT 10`, [s, e]),
            pool.query(`SELECT UPPER(TRIM(fleet_manager)) as name, SUM(profit - maintenance) as profit FROM trips WHERE trip_date BETWEEN DATE_SUB(?, INTERVAL 7 DAY) AND DATE_SUB(?, INTERVAL 7 DAY) GROUP BY UPPER(TRIM(fleet_manager))`, [s, e]),
            pool.query(`SELECT truck_number as id, MAX(brand) as brand, MAX(fleet_manager) as fm, SUM(profit) as gross_profit, SUM(maintenance) as maintenance, SUM(profit - maintenance) as net_profit, COUNT(*) as trips, SUM(CASE WHEN trip_category = 'IT' THEN 1 ELSE 0 END) as it_trips FROM trips WHERE trip_date BETWEEN ? AND ? GROUP BY truck_number ORDER BY net_profit DESC`, [s, e]),
            pool.query(`SELECT SUM(profit) as gross, SUM(maintenance) as maint FROM trips WHERE trip_date BETWEEN DATE_SUB(?, INTERVAL 7 DAY) AND DATE_SUB(?, INTERVAL 7 DAY)`, [s, e]),
            pool.query(`SELECT UPPER(TRIM(fleet_manager)) as name, COUNT(DISTINCT truck_number) as prev_active FROM trips WHERE trip_date BETWEEN DATE_SUB(?, INTERVAL 7 DAY) AND DATE_SUB(?, INTERVAL 7 DAY) GROUP BY UPPER(TRIM(fleet_manager))`, [s, e]),

            //  Brand Historical Trend
            pool.query(`
                SELECT 
                    brand,
                    DATE_FORMAT(DATE_SUB(trip_date, INTERVAL (WEEKDAY(DATE_SUB(trip_date, INTERVAL 4 DAY))) DAY), '%Y-%m-%d') as friday_start,
                    SUM(CASE WHEN UPPER(TRIM(trip_category)) != 'IT' AND trip_category IS NOT NULL THEN 1 ELSE 0 END) as revenue_trips,
                    COUNT(DISTINCT CASE WHEN UPPER(TRIM(trip_category)) != 'IT' AND trip_category IS NOT NULL THEN truck_number END) as active_trucks
                FROM trips 
                WHERE trip_date <= ? 
                GROUP BY brand, friday_start
                ORDER BY friday_start ASC`, [e]),

            //  Negative Profit Units
            pool.query(`
                SELECT 
                    truck_number, brand, fleet_manager, 
                    SUM(profit) as gross_profit, 
                    SUM(maintenance) as maintenance, 
                    SUM(profit - maintenance) as net_profit,
                    COUNT(*) as total_trips
                FROM trips 
                WHERE trip_date BETWEEN ? AND ?
                GROUP BY truck_number, brand, fleet_manager
                HAVING net_profit < 0
                ORDER BY net_profit ASC`, [s, e])
        ]);

        // --- DATA PROCESSING ---
        const curr = currRes[0][0];
        const currentWkNum = absoluteWeek ? parseInt(absoluteWeek) : 1;
        const calcPct = (c, p) => (p && p !== 0) ? Math.round(((c - p) / Math.abs(p)) * 100) : 0;
        const deployment = truckInsightRes[0][0] || { onlyRevenue: 0, onlyIT: 0, doubleDuty: 0 };

        //  Brand Historical Trend Alignment
        const brandRaw = brandTrendRes[0];
        const uniqueFridays = [...new Set(brandRaw.map(item => item.friday_start))].sort().slice(-4);
        const uniqueBrands = [...new Set(brandRaw.map(item => item.brand))].filter(b => b);

        const brandTrendData = uniqueBrands.map(brandName => {
            const dataByWeek = uniqueFridays.map(fri => {
                const match = brandRaw.find(r => r.brand === brandName && r.friday_start === fri);
                return { trips: match?.revenue_trips || 0, trucks: match?.active_trucks || 0 };
            });
            const changes = dataByWeek.map((val, idx) => {
                if (idx === 0) return 0;
                return calcPct(val.trips, dataByWeek[idx - 1].trips);
            }).slice(1);
            return { name: brandName, data: dataByWeek, changes };
        });

        //Brand Performance Summary
        const BRAND_CAPS = { HOWO: 30, IVECO: 23, MACK: 25, 'MAN TGA': 12 };
        const brandPerformance = brandRes[0].map(cb => {
            const normalizedBrandName = cb.name.toUpperCase();
            const cap = BRAND_CAPS[normalizedBrandName] || 25;
            const activeCommTrucks = cb.active_trucks || 0;
            const revenueTrips = cb.revenue_trips || 0; 
            
            return {
                name: cb.name,
                capacity: cap,
                active_trucks: activeCommTrucks,
                utilization_pct: cap > 0 ? Math.round((activeCommTrucks / cap) * 100) : 0,
                trips: revenueTrips,
                trip_share: Math.round((revenueTrips / (curr.non_it_trips || 1)) * 100),
                efficiency: activeCommTrucks > 0 ? (revenueTrips / activeCommTrucks).toFixed(1) : "0.0"
            };
        });

        //  Negative Profit Processing
        const negativeProfitTrucks = negativeProfitRes[0].map(t => ({
            ...t,
            maint_roi: t.gross_profit > 0 ? ((t.maintenance / t.gross_profit) * 100).toFixed(0) : '100+'
        }));

        //  Fleet Manager Mapping
        const MANAGER_CAPS = { 'BENJAMIN': 35, 'MICHAEL': 30, 'FATAI': 25 };
        const managers = (managerRes[0] || []).map(cm => {
            const normalizedKey = cm.name.toUpperCase();
            const pmTrucks = (fmPrevTrucksRes[0] || []).find(p => p.name === normalizedKey);
            const pmProfit = (fmPrevRes[0] || []).find(p => p.name === normalizedKey);
            const capacity = MANAGER_CAPS[normalizedKey] || 30;
            const truckDiff = cm.active_trucks - (pmTrucks?.prev_active || 0);
            const profitPct = calcPct(cm.profit, pmProfit?.profit || 0);

            return { 
                ...cm, 
                name: cm.name.charAt(0) + cm.name.slice(1).toLowerCase(),
                total_capacity: capacity,
                truck_diff: truckDiff,
                trip_share: Math.round((cm.trips / (curr.non_it_trips || 1)) * 100),
                efficiency: (cm.trips / (cm.active_trucks || 1)).toFixed(1),
                wow: `${profitPct >= 0 ? '+' : ''}${profitPct}%` 
            };
        });

        const totalPrevActive = (fmPrevTrucksRes[0] || []).reduce((sum, m) => sum + (m.prev_active || 0), 0);

        return {
            weekLabel: absoluteWeek ? `Week ${absoluteWeek}` : `${s} to ${e}`,
            absoluteWeek: currentWkNum,
            trips_breakdown: { total: curr.total_trips || 0, it: curr.it_trips || 0, non_it: curr.non_it_trips || 0 },
            trucks_insight: { total: curr.total_active_trucks || 0, ...deployment },
            grossProfit: curr.gross_profit_val || 0,
            maintenance: curr.total_maint || 0,
            netProfit: (curr.gross_profit_val || 0) - (curr.total_maint || 0),
            truckChange: curr.total_active_trucks - totalPrevActive,
            utilization: Math.round(((curr.total_active_trucks || 0) / 90) * 100),
            avgTripPerTruck: (curr.non_it_trips / (curr.active_trucks_non_it || 1)).toFixed(1),
            trends: (trendRes[0] || []).reverse().map((t, i) => ({ 
                week: `Week ${currentWkNum - (trendRes[0].length - 1 - i)}`, 
                trips: t.revenue_trips, 
                profit: t.total_net_profit, 
                active_trucks: t.revenue_trucks, 
                efficiency: (t.revenue_trips / (t.revenue_trucks || 1)).toFixed(1) 
            })),
            managers,
            brandPerformance, 
            brandTrendData,
            negativeProfitTrucks, 
            top25Percent: (allTrucksProfit[0] || []).slice(0, Math.ceil(allTrucksProfit[0].length * 0.25)),
            bottom25Percent: (allTrucksProfit[0] || []).slice(-Math.ceil(allTrucksProfit[0].length * 0.25)).reverse(),
            topVolume: topVolumeRes[0],
            topNonItProfit: topNonItProfitRes[0],
            topItProfit: topItProfitRes[0],
            financialWoW: {
                gross: { lastWeek: financialPrevRes[0][0]?.gross || 0, pct: calcPct(curr.gross_profit_val, financialPrevRes[0][0]?.gross) },
                maintenance: { lastWeek: financialPrevRes[0][0]?.maint || 0, pct: calcPct(curr.total_maint, financialPrevRes[0][0]?.maint) },
                net: { 
                    lastWeek: (financialPrevRes[0][0]?.gross - financialPrevRes[0][0]?.maint) || 0, 
                    pct: calcPct((curr.gross_profit_val - curr.total_maint), (financialPrevRes[0][0]?.gross - financialPrevRes[0][0]?.maint)) 
                }
            }
        };
    } catch (error) { 
        console.error("Critical Service Error:", error);
        throw error; 
    }
};

/**
 * Fetches the Monthly Executive Report
 * Optimized to handle case-sensitivity and accurate fleet deployment metrics.
 */
export const getMonthlyExecutiveReport = async (month, year) => {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    if (isNaN(m) || isNaN(y) || m < 1 || m > 12) {
        throw new Error(`Invalid date parameters: month=${month}, year=${year}`);
    }

    const FLEET_TOTAL_CAPACITY = 90;
    const MANAGER_CAPS = { 'BENJAMIN': 35, 'MICHAEL': 30, 'FATAI': 25 };
    const BRAND_CAPS = { 'HOWO': 30, 'IVECO': 23, 'MACK': 25, 'MAN TGA': 12 };

    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${lastDay} 23:59:59`;
    const lookbackDate = new Date(y, m - 4, 1).toISOString().split('T')[0];

    // Previous Month Dates (For MoM Trends)
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    const prevStartDate = `${prevY}-${String(prevM).padStart(2, '0')}-01`;
    const prevLastDay = new Date(prevY, prevM, 0).getDate();
    const prevEndDate = `${prevY}-${String(prevM).padStart(2, '0')}-${prevLastDay} 23:59:59`;

    const isNonIT = "(LOWER(trip_category) != 'it' OR trip_category IS NULL)";
    const isIT = "(LOWER(trip_category) = 'it')";

    try {
        const results = await Promise.all([
            // 0: Summary
            pool.query(`SELECT COUNT(*) as total_trips_raw, SUM(CASE WHEN ${isIT} THEN 1 ELSE 0 END) as it_trips, SUM(CASE WHEN ${isNonIT} THEN 1 ELSE 0 END) as non_it_trips, COUNT(DISTINCT CASE WHEN ${isNonIT} THEN truck_number END) as active_trucks_non_it, COUNT(DISTINCT CASE WHEN ${isIT} THEN truck_number END) as active_trucks_it_only, SUM(CASE WHEN ${isNonIT} THEN profit ELSE 0 END) as gross_profit_val, SUM(CASE WHEN ${isNonIT} THEN maintenance ELSE 0 END) as total_maint FROM trips WHERE trip_date BETWEEN ? AND ?`, [startDate, endDate]),
            // 1: Prev Month
            pool.query(`SELECT COUNT(*) as prev_trips FROM trips WHERE trip_date BETWEEN DATE_SUB(?, INTERVAL 1 MONTH) AND LAST_DAY(DATE_SUB(?, INTERVAL 1 MONTH)) AND ${isNonIT}`, [startDate, startDate]),
            // 2: Monthly Trends
            pool.query(`SELECT DATE_FORMAT(trip_date, '%b') as month_label, COUNT(DISTINCT CASE WHEN ${isNonIT} THEN truck_number END) as active_trucks, SUM(CASE WHEN ${isNonIT} THEN 1 ELSE 0 END) as trips, SUM(CASE WHEN ${isNonIT} THEN (COALESCE(profit,0) - COALESCE(maintenance,0)) ELSE 0 END) as net_profit FROM trips WHERE trip_date BETWEEN ? AND ? GROUP BY YEAR(trip_date), MONTH(trip_date), month_label ORDER BY YEAR(trip_date) ASC, MONTH(trip_date) ASC`, [lookbackDate, endDate]),
            // 3: Managers (Current)// 3: Managers (Current)
pool.query(`
    SELECT 
        UPPER(TRIM(main.fleet_manager)) as name, 
        COUNT(DISTINCT main.truck_number) as active_trucks_total, 
        COUNT(DISTINCT CASE WHEN ${isNonIT} THEN main.truck_number END) as active_trucks_non_it, 
        SUM(CASE WHEN ${isNonIT} THEN 1 ELSE 0 END) as trips_non_it, 
        SUM(COALESCE(main.profit, 0) - COALESCE(main.maintenance, 0)) as net_profit_total, 
        COALESCE(MAX(target_data.met_target_count), 0) as trucks_met_target 
    FROM trips main 
    LEFT JOIN (
        SELECT manager_name, COUNT(*) as met_target_count 
        FROM (
            SELECT UPPER(TRIM(fleet_manager)) as manager_name, truck_number 
            FROM trips 
            WHERE trip_date BETWEEN ? AND ? 
            GROUP BY UPPER(TRIM(fleet_manager)), truck_number 
            HAVING COUNT(*) >= 3
        ) as inner_counts 
        GROUP BY manager_name
    ) as target_data ON UPPER(TRIM(main.fleet_manager)) = target_data.manager_name 
    WHERE main.trip_date BETWEEN ? AND ? 
    GROUP BY UPPER(TRIM(main.fleet_manager))
`, [startDate, endDate, startDate, endDate]),
    
            // 4: Brand Breakdown
            pool.query(`SELECT COALESCE(brand, 'Unknown') as name, COUNT(DISTINCT truck_number) as active_trucks_non_it, SUM(1) as trips_non_it FROM trips WHERE trip_date BETWEEN ? AND ? AND ${isNonIT} GROUP BY brand`, [startDate, endDate]),
            // 5: Brand Trends (WoW)
            pool.query(`SELECT COALESCE(brand, 'Unknown') as brand, DATE_FORMAT(trip_date, '%b') as month_label, COUNT(DISTINCT truck_number) as active_trucks, COUNT(*) as trips FROM trips WHERE trip_date BETWEEN ? AND ? AND ${isNonIT} GROUP BY brand, YEAR(trip_date), MONTH(trip_date), month_label ORDER BY brand ASC, YEAR(trip_date) ASC, MONTH(trip_date) ASC`, [lookbackDate, endDate]),
            // 6: Top Volume
            pool.query(`SELECT truck_number, MAX(brand) as brand, COUNT(*) as trips, MAX(driver_name) as driver, MAX(fleet_manager) as fm FROM trips WHERE trip_date BETWEEN ? AND ? AND ${isNonIT} GROUP BY truck_number ORDER BY trips DESC LIMIT 5`, [startDate, endDate]),
            // 7: Top Profit (Detailed)
            pool.query(`SELECT truck_number, MAX(fleet_manager) as fm, SUM(CASE WHEN ${isIT} THEN COALESCE(profit, 0) ELSE 0 END) as it_profit, SUM(CASE WHEN ${isNonIT} THEN COALESCE(profit, 0) ELSE 0 END) as non_it_profit, SUM(COALESCE(profit, 0)) as grand_total, SUM(COALESCE(maintenance, 0)) as maintenance, COUNT(*) as trips, SUM(COALESCE(profit, 0) - COALESCE(maintenance, 0)) as net_profit FROM trips WHERE trip_date BETWEEN ? AND ? GROUP BY truck_number ORDER BY net_profit DESC LIMIT 10`, [startDate, endDate]),
            // 8: Managers (Previous) - For MoM comparisons
            pool.query(`SELECT UPPER(TRIM(main.fleet_manager)) as name, COUNT(DISTINCT main.truck_number) as active_trucks_total, COUNT(DISTINCT CASE WHEN ${isNonIT} THEN main.truck_number END) as active_trucks_non_it, SUM(CASE WHEN ${isNonIT} THEN 1 ELSE 0 END) as trips_non_it, SUM(COALESCE(main.profit, 0) - COALESCE(main.maintenance, 0)) as net_profit_total FROM trips main WHERE main.trip_date BETWEEN ? AND ? GROUP BY UPPER(TRIM(main.fleet_manager))`, [prevStartDate, prevEndDate])
        ]);

        const [currRows] = results[0]; const curr = currRows[0] || {};
        const [prevRows] = results[1]; const prevVol = prevRows[0]?.prev_trips || 0;
        const [trendData] = results[2];
        const [managerData] = results[3];
        const [brandData] = results[4];
        const [brandTrendRaw] = results[5];
        const [topVolumeData] = results[6];
        const [topProfitData] = results[7];
        const [prevManagerData] = results[8];

        const totalFleetTrips = managerData.reduce((sum, m) => sum + (Number(m.trips_non_it) || 0), 0);

        // --- Brand WoW Pivot ---
        const brandGroups = brandTrendRaw.reduce((acc, curr) => {
            if (!acc[curr.brand]) acc[curr.brand] = [];
            acc[curr.brand].push(curr);
            return acc;
        }, {});

        const processedBrandTrends = Object.keys(brandGroups).map(brandName => {
            const months = brandGroups[brandName];
            return {
                brand: brandName,
                monthlyData: months.map(m => ({ label: m.month_label, display: `${m.trips} / (${m.active_trucks})`, trips: m.trips })),
                changes: months.map((m, i) => {
                    if (i === 0) return null;
                    const prev = months[i-1].trips;
                    const diff = prev > 0 ? ((m.trips - prev) / prev) * 100 : 0;
                    return (diff > 0 ? "+" : "") + Math.round(diff) + "%";
                })
            };
        });

        // --- Manager MoM Trend Logic (With Previous Data Added) ---
        const allManagerNames = [...new Set([...managerData.map(m=>m.name), ...prevManagerData.map(m=>m.name)])].filter(Boolean);
        
        const processedManagerTrends = allManagerNames.map(mgrName => {
            const currMgr = managerData.find(m => m.name === mgrName) || {};
            const prevMgr = prevManagerData.find(m => m.name === mgrName) || {};
            
            const cap = MANAGER_CAPS[mgrName] || 30;
            
            const currTrips = Number(currMgr.trips_non_it || 0);
            const prevTrips = Number(prevMgr.trips_non_it || 0);
            
            // Using total trucks for utilization/profit logic just like the standard manager table
            const currTrucks = Number(currMgr.active_trucks_total || currMgr.active_trucks_non_it || 0);
            const prevTrucks = Number(prevMgr.active_trucks_total || prevMgr.active_trucks_non_it || 0);
            
            const currProfit = Number(currMgr.net_profit_total || 0);
            const prevProfit = Number(prevMgr.net_profit_total || 0);

            // Calculate Trips MoM % Change
            let diff = 0;
            if (prevTrips > 0) diff = ((currTrips - prevTrips) / prevTrips) * 100;
            else if (currTrips > 0) diff = 100;

            // Derived Metrics
            const currUtil = Math.round((currTrucks / cap) * 100);
            const prevUtil = Math.round((prevTrucks / cap) * 100);

           const currNonITTrucks = Number(currMgr.active_trucks_non_it || 0);
const currTT = currNonITTrucks > 0 ? (currTrips / currNonITTrucks).toFixed(1) : "0.0";
            const prevTT = prevTrucks > 0 ? (prevTrips / prevTrucks).toFixed(1) : "0.0";

            const currAvgProfit = currTrucks > 0 ? Math.round(currProfit / currTrucks) : 0;
            const prevAvgProfit = prevTrucks > 0 ? Math.round(prevProfit / prevTrucks) : 0;

            return {
                manager: mgrName,
                capacity: cap,
                currentMonthDisplay: `${currTrips} / (${currTrucks})`,
                lastMonthDisplay: `${prevTrips} / (${prevTrucks})`,
                change: diff === 0 ? "0%" : (diff > 0 ? "+" : "") + Math.round(diff) + "%",
                utilization_pct: currUtil,
                prev_utilization_pct: prevUtil,
                t_t: currTT,
                prev_t_t: prevTT,
                profit: currProfit,
                prev_profit: prevProfit,
                avg_profit: currAvgProfit,
                prev_avg_profit: prevAvgProfit
            };
        });

        return {
            reportMonth: new Date(y, m - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase(),
            prevMonthName: new Date(prevY, prevM - 1).toLocaleString('en-US', { month: 'short' }),
            currMonthName: new Date(y, m - 1).toLocaleString('en-US', { month: 'short' }),
            summary: {
                total_inhouse_trips: curr.non_it_trips || 0,
                trips_growth_pct: prevVol > 0 ? Math.round(((curr.non_it_trips - prevVol) / prevVol) * 100) : 0,
                active_trucks: curr.active_trucks_non_it || 0,
                it_only_trucks: Math.max(0, (curr.active_trucks_it_only || 0) - (curr.active_trucks_non_it || 0)),
                utilization_pct: Math.round((curr.active_trucks_non_it / FLEET_TOTAL_CAPACITY) * 100),
                avg_tt: curr.active_trucks_non_it ? (curr.non_it_trips / curr.active_trucks_non_it).toFixed(1) : "0.0",
                financials: { gross: curr.gross_profit_val || 0, maintenance: curr.total_maint || 0, net: (curr.gross_profit_val - curr.total_maint) }
            },
            trends: trendData.map((t, i, arr) => ({
                ...t,
                t_t: t.active_trucks ? (t.trips / t.active_trucks).toFixed(1) : "0.0"
            })),
            managers: managerData.map(mgr => {
                const cap = MANAGER_CAPS[mgr.name?.toUpperCase()] || 30;
                return {
                    name: mgr.name, capacity: cap,
                    active_trucks: Number(mgr.active_trucks_total),
                    utilization_pct: Math.round((Number(mgr.active_trucks_total) / cap) * 100),
                    total_trips: Number(mgr.trips_non_it),
                    trip_share: totalFleetTrips > 0 ? Math.round((mgr.trips_non_it / totalFleetTrips) * 100) : 0,
                    t_t: mgr.active_trucks_non_it > 0 ? (mgr.trips_non_it / mgr.active_trucks_non_it).toFixed(1) : "0.0",
                    target_pct: mgr.active_trucks_total > 0 ? Math.round((mgr.trucks_met_target / mgr.active_trucks_total) * 100) : 0,
                    profit: Number(mgr.net_profit_total),
                    avg_profit: mgr.active_trucks_total > 0 ? Math.round(mgr.net_profit_total / mgr.active_trucks_total) : 0
                };
            }),
            managerTrends: processedManagerTrends,
            brands: brandData.map(b => {
                const cap = BRAND_CAPS[b.name.toUpperCase()] || 25;
                return {
                    name: b.name, capacity: cap,
                    active_trucks: Number(b.active_trucks_non_it),
                    utilization_pct: Math.round((b.active_trucks_non_it / cap) * 100),
                    total_trips: Number(b.trips_non_it),
                    trip_share: totalFleetTrips > 0 ? Math.round((b.trips_non_it / totalFleetTrips) * 100) : 0,
                    t_t: b.active_trucks_non_it > 0 ? (b.trips_non_it / b.active_trucks_non_it).toFixed(1) : "0.0"
                };
            }),
            brandTrends: processedBrandTrends,
            topVolume: topVolumeData,
            topProfit: topProfitData
        };
    } catch (error) {
        console.error("Critical Report Failure:", error);
        throw error;
    }
};

export const getCustomRangeReport = async (startDate, endDate) => {
    try {
        const start = `${startDate} 00:00:00`;
        const end = `${endDate} 23:59:59`;

        // 1. OVERALL SUMMARY & FINANCIALS
        const [summaryRaw] = await pool.query(`
            SELECT 
                COUNT(id) as total_trips,
                COUNT(DISTINCT truck_number) as active_trucks, 
                SUM(trip_rate) as total_gross,
                SUM(maintenance) as total_maintenance,
                SUM(profit) as total_net
            FROM trips
            WHERE trip_date BETWEEN ? AND ?
        `, [start, end]);

        const summaryData = summaryRaw[0];
        const totalTrips = Number(summaryData.total_trips || 0);
        const activeTrucks = Number(summaryData.active_trucks || 0);
        const TOTAL_FLEET_SIZE = 90;

        const summary = {
            total_inhouse_trips: totalTrips,
            active_trucks: activeTrucks,
            total_fleet: TOTAL_FLEET_SIZE,
            utilization_pct: Math.round((activeTrucks / TOTAL_FLEET_SIZE) * 100) || 0,
            avg_tt: activeTrucks > 0 ? (totalTrips / activeTrucks).toFixed(1) : "0.0",
            financials: {
                gross: Number(summaryData.total_gross || 0),
                maintenance: Number(summaryData.total_maintenance || 0),
                net: Number(summaryData.total_net || 0)
            }
        };

        // 2. FLEET MANAGER INSIGHTS
        const MANAGER_CAPACITY = { 'MICHAEL': 30, 'BENJAMIN': 35, 'FATAI': 25 };
        const [managersRaw] = await pool.query(`
            SELECT 
                fleet_manager as name,
                COUNT(DISTINCT truck_number) as active_trucks,
                COUNT(id) as total_trips,
                SUM(profit) as profit
            FROM trips
            WHERE trip_date BETWEEN ? AND ?
            GROUP BY fleet_manager
            ORDER BY profit DESC
        `, [start, end]);

        const managers = managersRaw.map(m => {
            const managerName = m.name ? m.name.toUpperCase() : 'UNASSIGNED';
            const cap = MANAGER_CAPACITY[managerName] || 1;
            const mTrips = Number(m.total_trips || 0);
            const mActive = Number(m.active_trucks || 0);
            return {
                name: managerName,
                capacity: cap,
                active_trucks: mActive,
                utilization_pct: Math.round((mActive / cap) * 100),
                total_trips: mTrips,
                trip_share: totalTrips > 0 ? Math.round((mTrips / totalTrips) * 100) : 0,
                t_t: mActive > 0 ? (mTrips / mActive).toFixed(1) : "0.0",
                profit: Number(m.profit || 0),
                avg_profit: mActive > 0 ? (Number(m.profit || 0) / mActive) : 0
            };
        });

        // 3. BRAND PERFORMANCE
        const BRAND_CAPACITY = { 'HOWO': 30, 'IVECO': 23, 'MACK': 25, 'MAN TGA': 12 };
        const [brandsRaw] = await pool.query(`
            SELECT 
                brand as name,
                COUNT(DISTINCT truck_number) as active_trucks,
                COUNT(id) as total_trips
            FROM trips
            WHERE trip_date BETWEEN ? AND ?
            GROUP BY brand
            ORDER BY total_trips DESC
        `, [start, end]);

        const brands = brandsRaw.map(b => {
            const brandName = b.name ? b.name.toUpperCase() : 'UNKNOWN';
            const cap = BRAND_CAPACITY[brandName] || 1;
            const bTrips = Number(b.total_trips || 0);
            const bActive = Number(b.active_trucks || 0);
            return {
                name: brandName,
                capacity: cap,
                active_trucks: bActive,
                utilization_pct: Math.round((bActive / cap) * 100),
                total_trips: bTrips,
                trip_share: totalTrips > 0 ? Math.round((bTrips / totalTrips) * 100) : 0,
                t_t: bActive > 0 ? (bTrips / bActive).toFixed(1) : "0.0"
            };
        });

        // 4. TOP PERFORMERS: VOLUME
        const [topVolume] = await pool.query(`
            SELECT 
                truck_number, MAX(brand) as brand, COUNT(id) as trips,
                MAX(driver_name) as driver, MAX(fleet_manager) as fm
            FROM trips
            WHERE trip_date BETWEEN ? AND ?
            GROUP BY truck_number
            ORDER BY trips DESC
            LIMIT 5
        `, [start, end]);

        // 5. TOP PERFORMERS: PROFIT
        const [topProfit] = await pool.query(`
            SELECT 
                truck_number, MAX(fleet_manager) as fm, COUNT(id) as trips,
                SUM(CASE WHEN trip_category = 'IT' THEN profit ELSE 0 END) as it_profit,
                SUM(CASE WHEN trip_category != 'IT' THEN profit ELSE 0 END) as non_it_profit,
                SUM(maintenance) as maintenance, SUM(profit) as net_profit
            FROM trips
            WHERE trip_date BETWEEN ? AND ?
            GROUP BY truck_number
            ORDER BY net_profit DESC
            LIMIT 10
        `, [start, end]);

        return { summary, managers, brands, topVolume, topProfit };

    } catch (error) {
        console.error("Database Custom Range Error:", error);
        throw new Error("Failed to query custom range analytics from database.");
    }
};

export const fetchAllTrips = async () => {
    const [rows] = await pool.query('SELECT * FROM trips ORDER BY trip_date DESC');
    return rows;
};

