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
        SUM(CASE WHEN main.trip_category != 'IT' OR main.trip_category IS NULL THEN 1 ELSE 0 END) as trips,
        COUNT(DISTINCT main.truck_number) as active_trucks,
        SUM(main.profit - main.maintenance) as profit,
        GROUP_CONCAT(DISTINCT main.brand SEPARATOR ' AND ') as manager_brands,
        MAX(COALESCE(target.met_count, 0)) as trucks_met_target
    FROM trips main
    LEFT JOIN (
        SELECT UPPER(TRIM(fleet_manager)) as fm_key, COUNT(DISTINCT truck_number) as met_count
        FROM (
            SELECT fleet_manager, truck_number, COUNT(*) as trip_count
            FROM trips
            WHERE (trip_category != 'IT' OR trip_category IS NULL)
            AND trip_date BETWEEN ? AND ?
            GROUP BY fleet_manager, truck_number
            HAVING trip_count >= 3
        ) AS inner_count
        GROUP BY fm_key
    ) AS target ON UPPER(TRIM(main.fleet_manager)) = target.fm_key
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
        const MANAGER_CAPS = { 'BENJAMIN': 35, 'MICHEAL': 30, 'FATAI': 25 };
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
            avgTripPerTruck: (curr.non_it_trips / (curr.total_active_trucks || 1)).toFixed(1),
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

export const fetchAllTrips = async () => {
    const [rows] = await pool.query('SELECT * FROM trips ORDER BY trip_date DESC');
    return rows;
};