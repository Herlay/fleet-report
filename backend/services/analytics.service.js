import pool from '../config/db.js';
import { generateDeepDiveReport } from '../services/ai.service.js';

// ============================================================================
// HELPER: Dynamic Capacity Fetcher
// Fetches the historically accurate fleet capacities for ANY given date!
// ============================================================================
export const getCapacitiesForDate = async (targetDate) => {
    const sql = `
        SELECT c1.entity_type, c1.entity_name, c1.capacity
        FROM fleet_capacities c1
        INNER JOIN (
            SELECT entity_type, entity_name, MAX(effective_date) as max_date
            FROM fleet_capacities
            WHERE effective_date <= ?
            GROUP BY entity_type, entity_name
        ) c2 ON c1.entity_type = c2.entity_type 
             AND c1.entity_name = c2.entity_name 
             AND c1.effective_date = c2.max_date
    `;
    const [rows] = await pool.query(sql, [targetDate]);
    
    const TOTAL = rows.find(r => r.entity_type === 'TOTAL')?.capacity || 90;
    const MANAGER_CAPS = {};
    const BRAND_CAPS = {};
    
    rows.forEach(r => {
        if (r.entity_type === 'MANAGER') MANAGER_CAPS[r.entity_name.toUpperCase()] = r.capacity;
        if (r.entity_type === 'BRAND') BRAND_CAPS[r.entity_name.toUpperCase()] = r.capacity;
    });

    return { TOTAL, MANAGER_CAPS, BRAND_CAPS };
};

// ============================================================================

export const getTotalFleetSize = async () => {
    const [rows] = await pool.query('SELECT COUNT(DISTINCT truck_number) as total FROM trips');
    return rows[0].total || 0;
};

export const getWeeklySummary = async (weekStartDate) => {
    // Dynamically fetch capacity for this week
    const { TOTAL: totalFleet } = await getCapacitiesForDate(weekStartDate);

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

export const getTrends = async (limit = 4) => {
    const sql = `
        SELECT 
            uploaded_week as week,
            SUM(CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN 1 ELSE 0 END) as non_it_trips,
            COUNT(*) as total_trips,
            SUM(profit - maintenance) as net_profit,
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
            trips: nonItTrips, 
            profit: parseFloat(row.net_profit || 0),
            active_trucks: activeTrucks,
            efficiency: activeTrucks > 0 ? (nonItTrips / activeTrucks).toFixed(1) : "0.0"
        };
    }).reverse(); 
};

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

export const getRangeSummary = async (startDate, endDate) => {
    const { TOTAL: totalFleet } = await getCapacitiesForDate(endDate);

    const sqlTrips = `
        SELECT 
            COUNT(*) as total_trips,
            SUM(CASE WHEN trip_category = 'IT' THEN 1 ELSE 0 END) as it_trips,
            SUM(CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN 1 ELSE 0 END) as non_it_trips,
            SUM(profit) as total_profit,
            SUM(CASE WHEN trip_category = 'IT' THEN profit ELSE 0 END) as it_profit,
            SUM(CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN profit ELSE 0 END) as non_it_profit,
            AVG(profit) as avg_profit_per_trip,
            COUNT(DISTINCT truck_number) as active_trucks,
            SUM(road_expenses + dispatch + fuel_cost) as total_expenses
        FROM trips
        WHERE trip_date BETWEEN ? AND ?
    `;

    const sqlMaint = `
        SELECT COALESCE(SUM(amount), 0) as total_maintenance 
        FROM maintenance_logs 
        WHERE maintenance_date BETWEEN ? AND ?
    `;

    const [tripsRes, maintRes] = await Promise.all([
        pool.query(sqlTrips, [startDate, endDate]),
        pool.query(sqlMaint, [startDate, endDate])
    ]);

    const data = tripsRes[0][0];
    const totalMaint = Number(maintRes[0][0].total_maintenance || 0);

    return {
        ...data,
        total_maintenance: totalMaint, 
        utilization_rate: totalFleet > 0 ? ((data.active_trucks / totalFleet) * 100).toFixed(1) : 0,
        avg_trips_per_truck: data.active_trucks > 0 ? (data.total_trips / data.active_trucks).toFixed(1) : 0,
        total_fleet: totalFleet
    };
};


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

export const getRangeManagers = async (startDate, endDate) => {
    const sql = `
        SELECT 
            fleet_manager as name,
            COUNT(*) as trips,
            COUNT(DISTINCT truck_number) as active_trucks,
            SUM(profit) as profit,
            ROUND(COUNT(*) / COUNT(DISTINCT truck_number), 1) as efficiency
        FROM trips
        WHERE trip_date BETWEEN ? AND ?
        GROUP BY fleet_manager
        ORDER BY profit DESC
    `;
    const [rows] = await pool.query(sql, [startDate, endDate]);
    return rows;
};

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

    // --- DYNAMIC CAPACITIES FETCHED HERE ---
    const { TOTAL, MANAGER_CAPS, BRAND_CAPS } = await getCapacitiesForDate(e);

    try {
        const [
            currRes, prevBrandRes, trendTripsRes, brandRes, 
            truckInsightRes, managerTripsRes, topVolumeRes, 
            topNonItProfitRes, topItProfitRes, fmPrevRes, 
            allTrucksProfitRaw, financialPrevRes, fmPrevTrucksRes,
            brandTrendRes, maintTotalRes, maintTrendRes, 
            mgrMaintRes, truckMaintRes, maintPrevTotalRes, fmPrevMaintRes
        ] = await Promise.all([
            pool.query(`SELECT COUNT(*) as total_trips, SUM(CASE WHEN trip_category = 'IT' THEN 1 ELSE 0 END) as it_trips, SUM(CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN 1 ELSE 0 END) as non_it_trips, COUNT(DISTINCT truck_number) as total_active_trucks, COUNT(DISTINCT CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN truck_number END) as active_trucks_non_it, SUM(profit) as gross_profit_val FROM trips WHERE trip_date BETWEEN ? AND ?`, [s, e]),
            pool.query(`SELECT brand, COUNT(*) as trips FROM trips WHERE trip_date BETWEEN DATE_SUB(?, INTERVAL 7 DAY) AND DATE_SUB(?, INTERVAL 7 DAY) GROUP BY brand`, [s, e]),
            pool.query(`SELECT week_start_date, COUNT(CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN 1 END) as revenue_trips, COUNT(DISTINCT CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN truck_number END) as revenue_trucks, SUM(profit) as gross_profit FROM trips WHERE week_start_date <= (SELECT week_start_date FROM trips WHERE trip_date = ? LIMIT 1) GROUP BY week_start_date ORDER BY week_start_date DESC LIMIT 4`, [s]),
            pool.query(`SELECT brand as name, COUNT(DISTINCT CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN truck_number END) as active_trucks, SUM(CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN 1 ELSE 0 END) as revenue_trips, COUNT(*) as total_trips FROM trips WHERE trip_date BETWEEN ? AND ? GROUP BY brand`, [s, e]),
            pool.query(`SELECT COUNT(DISTINCT CASE WHEN did_revenue = 1 AND did_it = 0 THEN truck_number END) as onlyRevenue, COUNT(DISTINCT CASE WHEN did_revenue = 0 AND did_it = 1 THEN truck_number END) as onlyIT, COUNT(DISTINCT CASE WHEN did_revenue = 1 AND did_it = 1 THEN truck_number END) as doubleDuty FROM (SELECT truck_number, MAX(CASE WHEN trip_category != 'IT' OR trip_category IS NULL THEN 1 ELSE 0 END) as did_revenue, MAX(CASE WHEN trip_category = 'IT' THEN 1 ELSE 0 END) as did_it FROM trips WHERE trip_date BETWEEN ? AND ? GROUP BY truck_number) as deployment_stats`, [s, e]),
            pool.query(`SELECT UPPER(TRIM(main.fleet_manager)) as name, SUM(CASE WHEN main.trip_category != 'IT' OR main.trip_category IS NULL THEN 1 ELSE 0 END) as trips, COUNT(DISTINCT main.truck_number) as active_trucks, COUNT(DISTINCT CASE WHEN main.trip_category != 'IT' OR main.trip_category IS NULL THEN main.truck_number END) as revenue_trucks, SUM(main.profit) as gross_profit, GROUP_CONCAT(DISTINCT main.brand SEPARATOR ' AND ') as manager_brands, COUNT(DISTINCT CASE WHEN target.is_met = 1 THEN main.truck_number END) as trucks_met_target FROM trips main LEFT JOIN (SELECT UPPER(TRIM(fleet_manager)) as fm_key, truck_number, 1 as is_met FROM trips WHERE (trip_category != 'IT' OR trip_category IS NULL) AND trip_date BETWEEN ? AND ? GROUP BY UPPER(TRIM(fleet_manager)), truck_number HAVING COUNT(*) >= 3) AS target ON UPPER(TRIM(main.fleet_manager)) = target.fm_key AND main.truck_number = target.truck_number WHERE main.trip_date BETWEEN ? AND ? GROUP BY UPPER(TRIM(main.fleet_manager)) ORDER BY gross_profit DESC`, [s, e, s, e]),
            pool.query(`SELECT truck_number as id, MAX(driver_name) as driver, MAX(brand) as brand, MAX(fleet_manager) as fm, COUNT(*) as trips, SUM(CASE WHEN trip_category = 'IT' THEN 1 ELSE 0 END) as it_trips, SUM(profit) as profit FROM trips WHERE trip_date BETWEEN ? AND ? GROUP BY truck_number ORDER BY trips DESC LIMIT 10`, [s, e]),
            pool.query(`SELECT truck_number as id, MAX(brand) as brand, MAX(fleet_manager) as fm, COUNT(*) as trips, SUM(CASE WHEN trip_category = 'IT' THEN 1 ELSE 0 END) as it_trips, SUM(profit) as profit FROM trips WHERE trip_date BETWEEN ? AND ? AND (trip_category != 'IT' OR trip_category IS NULL) GROUP BY truck_number ORDER BY profit DESC LIMIT 10`, [s, e]),
            pool.query(`SELECT truck_number as id, MAX(brand) as brand, MAX(fleet_manager) as fm, COUNT(*) as trips, SUM(CASE WHEN trip_category = 'IT' THEN 1 ELSE 0 END) as it_trips, SUM(profit) as profit FROM trips WHERE trip_date BETWEEN ? AND ? AND trip_category = 'IT' GROUP BY truck_number ORDER BY profit DESC LIMIT 10`, [s, e]),
            pool.query(`SELECT UPPER(TRIM(fleet_manager)) as name, SUM(profit) as profit FROM trips WHERE trip_date BETWEEN DATE_SUB(?, INTERVAL 7 DAY) AND DATE_SUB(?, INTERVAL 7 DAY) GROUP BY UPPER(TRIM(fleet_manager))`, [s, e]),
            pool.query(`SELECT truck_number as id, MAX(brand) as brand, MAX(fleet_manager) as fm, SUM(profit) as gross_profit, COUNT(*) as trips, SUM(CASE WHEN trip_category = 'IT' THEN 1 ELSE 0 END) as it_trips FROM trips WHERE trip_date BETWEEN ? AND ? GROUP BY truck_number`, [s, e]),
            pool.query(`SELECT SUM(profit) as gross FROM trips WHERE trip_date BETWEEN DATE_SUB(?, INTERVAL 7 DAY) AND DATE_SUB(?, INTERVAL 7 DAY)`, [s, e]),
            pool.query(`SELECT UPPER(TRIM(fleet_manager)) as name, COUNT(DISTINCT truck_number) as prev_active FROM trips WHERE trip_date BETWEEN DATE_SUB(?, INTERVAL 7 DAY) AND DATE_SUB(?, INTERVAL 7 DAY) GROUP BY UPPER(TRIM(fleet_manager))`, [s, e]),
            pool.query(`SELECT brand, DATE_FORMAT(DATE_SUB(trip_date, INTERVAL (WEEKDAY(DATE_SUB(trip_date, INTERVAL 4 DAY))) DAY), '%Y-%m-%d') as friday_start, SUM(CASE WHEN UPPER(TRIM(trip_category)) != 'IT' AND trip_category IS NOT NULL THEN 1 ELSE 0 END) as revenue_trips, COUNT(DISTINCT CASE WHEN UPPER(TRIM(trip_category)) != 'IT' AND trip_category IS NOT NULL THEN truck_number END) as active_trucks FROM trips WHERE trip_date <= ? GROUP BY brand, friday_start ORDER BY friday_start ASC`, [e]),
            pool.query(`SELECT COALESCE(SUM(amount), 0) as maint FROM maintenance_logs WHERE maintenance_date BETWEEN ? AND ?`, [s, e]),
            pool.query(`SELECT DATE_SUB(maintenance_date, INTERVAL (WEEKDAY(DATE_SUB(maintenance_date, INTERVAL 4 DAY))) DAY) as week_start_date, SUM(amount) as maint FROM maintenance_logs WHERE maintenance_date <= ? GROUP BY week_start_date`, [e]),
            pool.query(`SELECT UPPER(TRIM(t.fleet_manager)) as name, SUM(m.amount) as maint FROM maintenance_logs m JOIN (SELECT truck_number, MAX(fleet_manager) as fleet_manager FROM trips WHERE trip_date BETWEEN ? AND ? GROUP BY truck_number) t ON m.truck_number COLLATE utf8mb4_general_ci = t.truck_number COLLATE utf8mb4_general_ci WHERE m.maintenance_date BETWEEN ? AND ? GROUP BY UPPER(TRIM(t.fleet_manager))`, [s, e, s, e]),
            pool.query(`SELECT truck_number, SUM(amount) as maint FROM maintenance_logs WHERE maintenance_date BETWEEN ? AND ? GROUP BY truck_number`, [s, e]),
            pool.query(`SELECT COALESCE(SUM(amount), 0) as maint FROM maintenance_logs WHERE maintenance_date BETWEEN DATE_SUB(?, INTERVAL 7 DAY) AND DATE_SUB(?, INTERVAL 7 DAY)`, [s, e]),
            pool.query(`SELECT UPPER(TRIM(t.fleet_manager)) as name, SUM(m.amount) as maint FROM maintenance_logs m JOIN (SELECT truck_number, MAX(fleet_manager) as fleet_manager FROM trips WHERE trip_date BETWEEN DATE_SUB(?, INTERVAL 7 DAY) AND DATE_SUB(?, INTERVAL 7 DAY) GROUP BY truck_number) t ON m.truck_number COLLATE utf8mb4_general_ci = t.truck_number COLLATE utf8mb4_general_ci WHERE m.maintenance_date BETWEEN DATE_SUB(?, INTERVAL 7 DAY) AND DATE_SUB(?, INTERVAL 7 DAY) GROUP BY UPPER(TRIM(t.fleet_manager))`, [s, e, s, e])
        ]);

        const curr = currRes[0][0];
        const currentWkNum = absoluteWeek ? parseInt(absoluteWeek) : 1;
        const calcPct = (c, p) => (p && p !== 0) ? Math.round(((c - p) / Math.abs(p)) * 100) : 0;
        const deployment = truckInsightRes[0][0] || { onlyRevenue: 0, onlyIT: 0, doubleDuty: 0 };

        const totalMaint = Number(maintTotalRes[0][0]?.maint || 0);
        const prevMaintTotal = Number(maintPrevTotalRes[0][0]?.maint || 0);
        const mgrMaintMap = mgrMaintRes[0].reduce((acc, r) => { acc[r.name] = Number(r.maint); return acc; }, {});
        const truckMaintMap = truckMaintRes[0].reduce((acc, r) => { acc[r.truck_number] = Number(r.maint); return acc; }, {});
        const fmPrevMaintMap = fmPrevMaintRes[0].reduce((acc, r) => { acc[r.name] = Number(r.maint); return acc; }, {});

        const trends = trendTripsRes[0].map(t => {
            const tripWkStr = t.week_start_date ? t.week_start_date.toISOString().split('T')[0] : '';
            const maintMatch = maintTrendRes[0].find(m => {
                const maintWkStr = m.week_start_date ? m.week_start_date.toISOString().split('T')[0] : '';
                return maintWkStr === tripWkStr;
            });
            return {
                ...t, total_net_profit: Number(t.gross_profit) - Number(maintMatch?.maint || 0)
            };
        }).reverse().map((t, i) => ({ 
            week: `Week ${currentWkNum - (trendTripsRes[0].length - 1 - i)}`, 
            trips: t.revenue_trips, 
            profit: t.total_net_profit, 
            active_trucks: t.revenue_trucks, 
            efficiency: (t.revenue_trips / (t.revenue_trucks || 1)).toFixed(1) 
        }));

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

        const brandPerformance = brandRes[0].map(cb => {
            const normalizedBrandName = cb.name.toUpperCase();
            const cap = BRAND_CAPS[normalizedBrandName] || 25; 
            const activeCommTrucks = cb.active_trucks || 0;
            const revenueTrips = cb.revenue_trips || 0; 
            
            return {
                name: cb.name, capacity: cap, active_trucks: activeCommTrucks,
                utilization_pct: cap > 0 ? Math.round((activeCommTrucks / cap) * 100) : 0,
                trips: revenueTrips, trip_share: Math.round((revenueTrips / (curr.non_it_trips || 1)) * 100),
                efficiency: activeCommTrucks > 0 ? (revenueTrips / activeCommTrucks).toFixed(1) : "0.0"
            };
        });

        const allTrucksProcessed = allTrucksProfitRaw[0].map(t => {
            const maint = truckMaintMap[t.id] || 0;
            const net_profit = Number(t.gross_profit) - maint;
            return { ...t, maintenance: maint, net_profit };
        });

        const sortedTrucks = [...allTrucksProcessed].sort((a,b) => b.net_profit - a.net_profit);
        
        const negativeProfitTrucks = allTrucksProcessed
            .filter(t => t.net_profit < 0)
            .sort((a,b) => a.net_profit - b.net_profit)
            .map(t => ({
                truck_number: t.id, brand: t.brand, fleet_manager: t.fm, total_trips: t.trips,
                gross_profit: t.gross_profit, maintenance: t.maintenance, net_profit: t.net_profit,
                maint_roi: t.gross_profit > 0 ? ((t.maintenance / t.gross_profit) * 100).toFixed(0) : '100+'
            }));

        const totalPrevActive = (fmPrevTrucksRes[0] || []).reduce((sum, m) => sum + (m.prev_active || 0), 0);

        const managers = (managerTripsRes[0] || []).map(cm => {
            const normalizedKey = cm.name.toUpperCase();
            
            const pmTrucks = (fmPrevTrucksRes[0] || []).find(p => p.name === normalizedKey);
            const prevGross = Number((fmPrevRes[0] || []).find(p => p.name === normalizedKey)?.profit || 0);
            const prevMaint = fmPrevMaintMap[normalizedKey] || 0;
            const prevNetProfit = prevGross - prevMaint;

            const capacity = MANAGER_CAPS[normalizedKey] || 30;
            const truckDiff = cm.active_trucks - (pmTrucks?.prev_active || 0);
            const maint = mgrMaintMap[normalizedKey] || 0;
            const netProfit = Number(cm.gross_profit) - maint;
            
            const profitPct = calcPct(netProfit, prevNetProfit);

            return { 
                ...cm, 
                name: cm.name.charAt(0) + cm.name.slice(1).toLowerCase(),
                total_capacity: capacity,
                truck_diff: truckDiff,
                trip_share: Math.round((cm.trips / (curr.non_it_trips || 1)) * 100),
                efficiency: (cm.trips / (cm.active_trucks || 1)).toFixed(1),
                wow: `${profitPct >= 0 ? '+' : ''}${profitPct}%`,
                profit: netProfit,
                avg_profit: cm.active_trucks > 0 ? Math.round(netProfit / cm.active_trucks) : 0
            };
        });

        const prevGross = Number(financialPrevRes[0][0]?.gross || 0);
        const prevNet = prevGross - prevMaintTotal;
        const currNet = (curr.gross_profit_val || 0) - totalMaint;

        return {
            weekLabel: absoluteWeek ? `Week ${absoluteWeek}` : `${s} to ${e}`,
            absoluteWeek: currentWkNum,
            trips_breakdown: { total: curr.total_trips || 0, it: curr.it_trips || 0, non_it: curr.non_it_trips || 0 },
            trucks_insight: { total: curr.total_active_trucks || 0, ...deployment },
            grossProfit: curr.gross_profit_val || 0,
            maintenance: totalMaint,
            netProfit: currNet,
            truckChange: curr.total_active_trucks - totalPrevActive,
            utilization: Math.round(((curr.total_active_trucks || 0) / TOTAL) * 100),
            avgTripPerTruck: (curr.non_it_trips / (curr.active_trucks_non_it || 1)).toFixed(1),
            trends,
            managers,
            brandPerformance, 
            brandTrendData,
            negativeProfitTrucks, 
            top25Percent: sortedTrucks.slice(0, Math.ceil(sortedTrucks.length * 0.25)),
            bottom25Percent: sortedTrucks.slice(-Math.ceil(sortedTrucks.length * 0.25)).reverse(),
            topVolume: topVolumeRes[0],
            topNonItProfit: topNonItProfitRes[0],
            topItProfit: topItProfitRes[0],
            financialWoW: {
                gross: { lastWeek: prevGross, pct: calcPct(curr.gross_profit_val, prevGross) },
                maintenance: { lastWeek: prevMaintTotal, pct: calcPct(totalMaint, prevMaintTotal) },
                net: { lastWeek: prevNet, pct: calcPct(currNet, prevNet) }
            }
        };
    } catch (error) { 
        console.error("Critical Service Error:", error);
        throw error; 
    }
};

export const getMonthlyExecutiveReport = async (month, year) => {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    if (isNaN(m) || isNaN(y) || m < 1 || m > 12) {
        throw new Error(`Invalid date parameters: month=${month}, year=${year}`);
    }

    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${lastDay} 23:59:59`;
    const lookbackDate = new Date(y, m - 4, 1).toISOString().split('T')[0];

    // --- DYNAMIC CAPACITIES FETCHED HERE ---
    const { TOTAL, MANAGER_CAPS, BRAND_CAPS } = await getCapacitiesForDate(endDate);

    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    const prevStartDate = `${prevY}-${String(prevM).padStart(2, '0')}-01`;
    const prevLastDay = new Date(prevY, prevM, 0).getDate();
    const prevEndDate = `${prevY}-${String(prevM).padStart(2, '0')}-${prevLastDay} 23:59:59`;

    const isNonIT = "(LOWER(trip_category) != 'it' OR trip_category IS NULL)";
    const isIT = "(LOWER(trip_category) = 'it')";

    // ARCHITECT FIX: TEU Logic Query (Only 40FT/45FT, 2x20FT, 20FT. Excludes IT trips)
    const teuQuery = `
      SELECT 
        CASE 
          WHEN size LIKE '%45%' OR size LIKE '%40%' THEN '40FT'
          WHEN size LIKE '%2%20%' THEN '2 x 20FT'
          WHEN size LIKE '%20%' THEN '20FT'
          ELSE 'EXCLUDE'
        END AS formatted_size, 
        COUNT(*) AS jobs,
        SUM(
          CASE 
            WHEN size LIKE '%45%' OR size LIKE '%40%' THEN 2
            WHEN size LIKE '%2%20%' THEN 2 
            WHEN size LIKE '%20%' THEN 1
            ELSE 0 
          END
        ) AS teus
      FROM trips
      WHERE trip_date BETWEEN ? AND ?
        AND size IS NOT NULL AND size != ''
        AND ${isNonIT}
      GROUP BY formatted_size
      HAVING formatted_size != 'EXCLUDE'
      ORDER BY jobs DESC
    `;

    // ARCHITECT FIX: Split logic shifted to IT vs NON-IT (No Third Party)
    const splitQuery = `
      SELECT 
        SUM(CASE WHEN ${isNonIT} THEN 1 ELSE 0 END) as non_it_trips,
        SUM(CASE WHEN ${isIT} THEN 1 ELSE 0 END) as it_trips,
        COUNT(*) as total_trips
      FROM trips
      WHERE trip_date BETWEEN ? AND ?
    `;

    try {
        const [
            currRes, prevRes, trendTripsRes, managerTripsRes, brandRes, 
            brandTrendRes, topVolumeRes, topProfitRawRes, prevManagerTripsRes,
            maintTotalRes, maintPrevTotalRes, maintMonthlyRes, mgrMaintRes, 
            prevMgrMaintRes, truckMaintRes, teuRes, splitRes
        ] = await Promise.all([
            pool.query(`SELECT COUNT(*) as total_trips_raw, SUM(CASE WHEN ${isIT} THEN 1 ELSE 0 END) as it_trips, SUM(CASE WHEN ${isNonIT} THEN 1 ELSE 0 END) as non_it_trips, COUNT(DISTINCT CASE WHEN ${isNonIT} THEN truck_number END) as active_trucks_non_it, COUNT(DISTINCT CASE WHEN ${isIT} THEN truck_number END) as active_trucks_it_only, SUM(CASE WHEN ${isNonIT} THEN profit ELSE 0 END) as gross_profit_val FROM trips WHERE trip_date BETWEEN ? AND ?`, [startDate, endDate]),
            pool.query(`SELECT COUNT(*) as prev_trips FROM trips WHERE trip_date BETWEEN ? AND ? AND ${isNonIT}`, [prevStartDate, prevEndDate]),
            pool.query(`
              SELECT 
                DATE_FORMAT(trip_date, '%b') as month_label, 
                YEAR(trip_date) as y, 
                MONTH(trip_date) as m, 
                COUNT(DISTINCT CASE WHEN ${isNonIT} THEN truck_number END) as active_trucks, 
                SUM(CASE WHEN ${isNonIT} THEN 1 ELSE 0 END) as trips, 
                SUM(CASE WHEN ${isNonIT} THEN COALESCE(profit,0) ELSE 0 END) as gross_profit,
                
                SUM(CASE WHEN ${isNonIT} THEN (
                  CASE 
                    WHEN size LIKE '%45%' OR size LIKE '%40%' THEN 2
                    WHEN size LIKE '%2%20%' THEN 2 
                    WHEN size LIKE '%20%' THEN 1
                    ELSE 0 
                  END
                ) ELSE 0 END) as teus

              FROM trips 
              WHERE trip_date BETWEEN ? AND ? 
              GROUP BY y, m, month_label 
              ORDER BY y ASC, m ASC
            `, [lookbackDate, endDate]),
            pool.query(`SELECT UPPER(TRIM(main.fleet_manager)) as name, COUNT(DISTINCT main.truck_number) as active_trucks_total, COUNT(DISTINCT CASE WHEN ${isNonIT} THEN main.truck_number END) as active_trucks_non_it, SUM(CASE WHEN ${isNonIT} THEN 1 ELSE 0 END) as trips_non_it, SUM(COALESCE(main.profit, 0)) as gross_profit_total, COALESCE(MAX(target_data.met_target_count), 0) as trucks_met_target FROM trips main LEFT JOIN (SELECT manager_name, COUNT(*) as met_target_count FROM (SELECT UPPER(TRIM(fleet_manager)) as manager_name, truck_number FROM trips WHERE trip_date BETWEEN ? AND ? GROUP BY UPPER(TRIM(fleet_manager)), truck_number HAVING COUNT(*) >= 3) as inner_counts GROUP BY manager_name) as target_data ON UPPER(TRIM(main.fleet_manager)) = target_data.manager_name WHERE main.trip_date BETWEEN ? AND ? GROUP BY UPPER(TRIM(main.fleet_manager))`, [startDate, endDate, startDate, endDate]),
            pool.query(`SELECT COALESCE(brand, 'Unknown') as name, COUNT(DISTINCT truck_number) as active_trucks_non_it, SUM(1) as trips_non_it FROM trips WHERE trip_date BETWEEN ? AND ? AND ${isNonIT} GROUP BY brand`, [startDate, endDate]),
            pool.query(`SELECT COALESCE(brand, 'Unknown') as brand, DATE_FORMAT(trip_date, '%b') as month_label, COUNT(DISTINCT truck_number) as active_trucks, COUNT(*) as trips FROM trips WHERE trip_date BETWEEN ? AND ? AND ${isNonIT} GROUP BY brand, YEAR(trip_date), MONTH(trip_date), month_label ORDER BY brand ASC, YEAR(trip_date) ASC, MONTH(trip_date) ASC`, [lookbackDate, endDate]),
            pool.query(`SELECT truck_number, MAX(brand) as brand, COUNT(*) as trips, MAX(driver_name) as driver, MAX(fleet_manager) as fm FROM trips WHERE trip_date BETWEEN ? AND ? AND ${isNonIT} GROUP BY truck_number ORDER BY trips DESC LIMIT 5`, [startDate, endDate]),
            pool.query(`SELECT truck_number, MAX(brand) as brand, MAX(fleet_manager) as fm, SUM(CASE WHEN ${isIT} THEN COALESCE(profit, 0) ELSE 0 END) as it_profit, SUM(CASE WHEN ${isNonIT} THEN COALESCE(profit, 0) ELSE 0 END) as non_it_profit, SUM(COALESCE(profit, 0)) as gross_total, COUNT(*) as trips FROM trips WHERE trip_date BETWEEN ? AND ? GROUP BY truck_number`, [startDate, endDate]),
            pool.query(`SELECT UPPER(TRIM(main.fleet_manager)) as name, COUNT(DISTINCT main.truck_number) as active_trucks_total, COUNT(DISTINCT CASE WHEN ${isNonIT} THEN main.truck_number END) as active_trucks_non_it, SUM(CASE WHEN ${isNonIT} THEN 1 ELSE 0 END) as trips_non_it, SUM(COALESCE(main.profit, 0)) as gross_profit_total FROM trips main WHERE main.trip_date BETWEEN ? AND ? GROUP BY UPPER(TRIM(main.fleet_manager))`, [prevStartDate, prevEndDate]),
            pool.query(`SELECT COALESCE(SUM(amount), 0) as total_maint FROM maintenance_logs WHERE maintenance_date BETWEEN ? AND ?`, [startDate, endDate]),
            pool.query(`SELECT COALESCE(SUM(amount), 0) as total_maint FROM maintenance_logs WHERE maintenance_date BETWEEN ? AND ?`, [prevStartDate, prevEndDate]),
            pool.query(`SELECT DATE_FORMAT(maintenance_date, '%b') as month_label, YEAR(maintenance_date) as y, MONTH(maintenance_date) as m, SUM(amount) as maint FROM maintenance_logs WHERE maintenance_date BETWEEN ? AND ? GROUP BY y, m, month_label`, [lookbackDate, endDate]),
            pool.query(`SELECT UPPER(TRIM(t.fleet_manager)) as name, SUM(m.amount) as maint FROM maintenance_logs m JOIN (SELECT truck_number, MAX(fleet_manager) as fleet_manager FROM trips WHERE trip_date BETWEEN ? AND ? GROUP BY truck_number) t ON m.truck_number COLLATE utf8mb4_general_ci = t.truck_number COLLATE utf8mb4_general_ci WHERE m.maintenance_date BETWEEN ? AND ? GROUP BY UPPER(TRIM(t.fleet_manager))`, [startDate, endDate, startDate, endDate]),
            pool.query(`SELECT UPPER(TRIM(t.fleet_manager)) as name, SUM(m.amount) as maint FROM maintenance_logs m JOIN (SELECT truck_number, MAX(fleet_manager) as fleet_manager FROM trips WHERE trip_date BETWEEN ? AND ? GROUP BY truck_number) t ON m.truck_number COLLATE utf8mb4_general_ci = t.truck_number COLLATE utf8mb4_general_ci WHERE m.maintenance_date BETWEEN ? AND ? GROUP BY UPPER(TRIM(t.fleet_manager))`, [prevStartDate, prevEndDate, prevStartDate, prevEndDate]),
            pool.query(`SELECT truck_number, SUM(amount) as maint FROM maintenance_logs WHERE maintenance_date BETWEEN ? AND ? GROUP BY truck_number`, [startDate, endDate]),
            pool.query(teuQuery, [startDate, endDate]),
            pool.query(splitQuery, [startDate, endDate])
        ]);

        const curr = currRes[0][0] || {};
        const prevVol = prevRes[0][0]?.prev_trips || 0;
        const trendTripsData = trendTripsRes[0];
        const managerTripsData = managerTripsRes[0];
        const brandData = brandRes[0];
        const brandTrendRaw = brandTrendRes[0];
        const topVolumeData = topVolumeRes[0];
        const topProfitRaw = topProfitRawRes[0];
        const prevManagerTripsData = prevManagerTripsRes[0];

        const totalMaint = Number(maintTotalRes[0][0]?.total_maint || 0);
        const prevTotalMaint = Number(maintPrevTotalRes[0][0]?.total_maint || 0);
        const maintMonthlyRaw = maintMonthlyRes[0];
        const mgrMaintMap = mgrMaintRes[0].reduce((acc, r) => { acc[r.name] = Number(r.maint); return acc; }, {});
        const prevMgrMaintMap = prevMgrMaintRes[0].reduce((acc, r) => { acc[r.name] = Number(r.maint); return acc; }, {});
        const truckMaintMap = truckMaintRes[0].reduce((acc, r) => { acc[r.truck_number] = Number(r.maint); return acc; }, {});

        const totalFleetTrips = managerTripsData.reduce((sum, m) => sum + (Number(m.trips_non_it) || 0), 0);

        // --- 1. Process TEU Distribution (Strict 3 Buckets) ---
        const predefinedSizes = ['2 x 20FT', '20FT', '40FT'];
        const teuDistribution = predefinedSizes.map(targetSize => {
            const foundRow = teuRes[0].find(row => row.formatted_size === targetSize);
            if (foundRow) {
                return {
                    size: targetSize,
                    jobs: foundRow.jobs,
                    teus: foundRow.teus > 0 ? foundRow.teus : "-" 
                };
            }
            return {
                size: targetSize,
                jobs: 0,
                teus: 0
            };
        });

        // --- 2. Process Job Distribution Text (IT vs Non-IT) ---
        const splitData = splitRes[0][0] || {};
        const splitTotal = splitData.total_trips || 0;
        const splitNonIt = splitData.non_it_trips || 0;
        const splitIt = splitData.it_trips || 0;
        const nonItPct = splitTotal > 0 ? Math.round((splitNonIt / splitTotal) * 100) : 0;
        const itPct = splitTotal > 0 ? Math.round((splitIt / splitTotal) * 100) : 0;
        
        const jobDistributionText = `Out of the ${splitTotal} total jobs done, ${splitNonIt} (that is ${nonItPct}%) were Commercial/Non-IT trips, while ${splitIt} (${itPct}%) were designated as IT (Internal Transfer) jobs.`;

        // 3. Process Truck Profitability & Red Zone
        const allTruckProfits = topProfitRaw.map(t => {
            const maint = truckMaintMap[t.truck_number] || 0;
            const gross = Number(t.gross_total) || 0;
            return {
                truck_number: t.truck_number,
                it_profit: Number(t.it_profit) || 0,
                non_it_profit: Number(t.non_it_profit) || 0,
                trips: t.trips,
                fm: t.fm || 'Unknown',
                brand: t.brand || 'Unknown',
                profit: gross,
                maint: maint,
                net_profit: gross - maint,
                comments: '' 
            };
        });

        const topProfitability = [...allTruckProfits]
            .sort((a, b) => b.net_profit - a.net_profit)
            .slice(0, 15);

        const redZone = allTruckProfits
            .filter(t => t.net_profit < 0)
            .sort((a, b) => a.net_profit - b.net_profit); 

        // --- EXISTING TREND & MANAGER PROCESSING ---
        const trendData = trendTripsData.map(t => {
            const maintMatch = maintMonthlyRaw.find(m => m.y === t.y && m.m === t.m);
            return {
                ...t,
                net_profit: Number(t.gross_profit) - Number(maintMatch?.maint || 0)
            };
        });

        const brandGroups = brandTrendRaw.reduce((acc, current) => {
            if (!acc[current.brand]) acc[current.brand] = [];
            acc[current.brand].push(current);
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

        const managerData = managerTripsData.map(mgr => ({
            ...mgr, net_profit_total: Number(mgr.gross_profit_total) - (mgrMaintMap[mgr.name] || 0)
        }));
        
        const prevManagerData = prevManagerTripsData.map(mgr => ({
            ...mgr, net_profit_total: Number(mgr.gross_profit_total) - (prevMgrMaintMap[mgr.name] || 0)
        }));

        const allManagerNames = [...new Set([...managerData.map(m=>m.name), ...prevManagerData.map(m=>m.name)])].filter(Boolean);
        
        const processedManagerTrends = allManagerNames.map(mgrName => {
            const currMgr = managerData.find(m => m.name === mgrName) || {};
            const prevMgr = prevManagerData.find(m => m.name === mgrName) || {};
            
            const cap = MANAGER_CAPS[mgrName] || 30;
            const currTrips = Number(currMgr.trips_non_it || 0);
            const prevTrips = Number(prevMgr.trips_non_it || 0);
            
            const currTrucks = Number(currMgr.active_trucks_total || currMgr.active_trucks_non_it || 0);
            const prevTrucks = Number(prevMgr.active_trucks_total || prevMgr.active_trucks_non_it || 0);
            
            const currProfit = Number(currMgr.net_profit_total || 0);
            const prevProfit = Number(prevMgr.net_profit_total || 0);

            let diff = 0;
            if (prevTrips > 0) diff = ((currTrips - prevTrips) / prevTrips) * 100;
            else if (currTrips > 0) diff = 100;

            const currUtil = Math.round((currTrucks / cap) * 100);
            const prevUtil = Math.round((prevTrucks / cap) * 100);

            const currNonITTrucks = Number(currMgr.active_trucks_non_it || 0);
            const currTT = currNonITTrucks > 0 ? (currTrips / currNonITTrucks).toFixed(1) : "0.0";
            const prevTT = prevTrucks > 0 ? (prevTrips / prevTrucks).toFixed(1) : "0.0";

            return {
                manager: mgrName, capacity: cap,
                currentMonthDisplay: `${currTrips} / (${currTrucks})`,
                lastMonthDisplay: `${prevTrips} / (${prevTrucks})`,
                change: diff === 0 ? "0%" : (diff > 0 ? "+" : "") + Math.round(diff) + "%",
                utilization_pct: currUtil, prev_utilization_pct: prevUtil,
                t_t: currTT, prev_t_t: prevTT,
                profit: currProfit, prev_profit: prevProfit,
                avg_profit: currTrucks > 0 ? Math.round(currProfit / currTrucks) : 0,
                prev_avg_profit: prevTrucks > 0 ? Math.round(prevProfit / prevTrucks) : 0
            };
        });

        // --- FINAL RETURN OBJECT ---
        return {
            reportMonth: new Date(y, m - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase(),
            prevMonthName: new Date(prevY, prevM - 1).toLocaleString('en-US', { month: 'short' }),
            currMonthName: new Date(y, m - 1).toLocaleString('en-US', { month: 'short' }),
            summary: {
                total_inhouse_trips: curr.non_it_trips || 0,
                trips_growth_pct: prevVol > 0 ? Math.round(((curr.non_it_trips - prevVol) / prevVol) * 100) : 0,
                active_trucks: curr.active_trucks_non_it || 0,
                it_only_trucks: Math.max(0, (curr.active_trucks_it_only || 0) - (curr.active_trucks_non_it || 0)),
                utilization_pct: Math.round((curr.active_trucks_non_it / TOTAL) * 100),
                avg_tt: curr.active_trucks_non_it ? (curr.non_it_trips / curr.active_trucks_non_it).toFixed(1) : "0.0",
                financials: { gross: curr.gross_profit_val || 0, maintenance: totalMaint, net: (curr.gross_profit_val - totalMaint) },
                job_distribution_text: jobDistributionText 
            },
            
            teuDistribution,
            topProfitability,
            redZone,

            trends: trendData.map((t) => ({
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
            topVolume: topVolumeData.map(tv => {
                const match = allTruckProfits.find(t => t.truck_number === tv.truck_number);
                return { ...tv, net_profit: match?.net_profit || 0 };
            }),
            topProfit: [] 
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

        const isNonIT = "(LOWER(trip_category) != 'it' OR trip_category IS NULL)";
        const isIT = "(LOWER(trip_category) = 'it')";

        // --- DYNAMIC CAPACITIES FETCHED HERE ---
        const { TOTAL, MANAGER_CAPS, BRAND_CAPS } = await getCapacitiesForDate(end);

        const [
            summaryRaw, maintRaw, managersRaw, mgrMaintRaw,
            brandsRaw, topVolumeRaw, trucksRaw, truckMaintRaw
        ] = await Promise.all([
            pool.query(`SELECT COUNT(id) as total_trips, COUNT(DISTINCT truck_number) as active_trucks, SUM(trip_rate) as total_gross, SUM(profit) as total_profit_trips FROM trips WHERE trip_date BETWEEN ? AND ?`, [start, end]),
            pool.query(`SELECT COALESCE(SUM(amount), 0) as total_maint FROM maintenance_logs WHERE maintenance_date BETWEEN ? AND ?`, [start, end]),
            pool.query(`SELECT fleet_manager as name, COUNT(DISTINCT truck_number) as active_trucks, COUNT(id) as total_trips, SUM(profit) as gross_profit FROM trips WHERE trip_date BETWEEN ? AND ? GROUP BY fleet_manager`, [start, end]),
            pool.query(`SELECT UPPER(TRIM(t.fleet_manager)) as name, SUM(m.amount) as maint FROM maintenance_logs m JOIN (SELECT truck_number, MAX(fleet_manager) as fleet_manager FROM trips WHERE trip_date BETWEEN ? AND ? GROUP BY truck_number) t ON m.truck_number COLLATE utf8mb4_general_ci = t.truck_number COLLATE utf8mb4_general_ci WHERE m.maintenance_date BETWEEN ? AND ? GROUP BY UPPER(TRIM(t.fleet_manager))`, [start, end, start, end]),
            pool.query(`SELECT brand as name, COUNT(DISTINCT truck_number) as active_trucks, COUNT(id) as total_trips FROM trips WHERE trip_date BETWEEN ? AND ? GROUP BY brand ORDER BY total_trips DESC`, [start, end]),
            pool.query(`SELECT truck_number, MAX(brand) as brand, COUNT(id) as trips, MAX(driver_name) as driver, MAX(fleet_manager) as fm FROM trips WHERE trip_date BETWEEN ? AND ? GROUP BY truck_number ORDER BY trips DESC LIMIT 5`, [start, end]),
            pool.query(`SELECT truck_number, MAX(fleet_manager) as fm, COUNT(id) as trips, SUM(CASE WHEN ${isIT} THEN profit ELSE 0 END) as it_profit, SUM(CASE WHEN ${isNonIT} THEN profit ELSE 0 END) as non_it_profit, SUM(profit) as gross_profit FROM trips WHERE trip_date BETWEEN ? AND ? GROUP BY truck_number`, [start, end]),
            pool.query(`SELECT truck_number, SUM(amount) as maint FROM maintenance_logs WHERE maintenance_date BETWEEN ? AND ? GROUP BY truck_number`, [start, end])
        ]);

        const summaryData = summaryRaw[0][0] || {};
        const totalTrips = Number(summaryData.total_trips || 0);
        const activeTrucks = Number(summaryData.active_trucks || 0);
        const totalGross = Number(summaryData.total_profit_trips || 0);
        const totalMaint = Number(maintRaw[0][0]?.total_maint || 0);

        const summary = {
            total_inhouse_trips: totalTrips,
            active_trucks: activeTrucks,
            total_fleet: TOTAL,
            utilization_pct: Math.round((activeTrucks / TOTAL) * 100) || 0,
            avg_tt: activeTrucks > 0 ? (totalTrips / activeTrucks).toFixed(1) : "0.0",
            financials: {
                gross: totalGross,
                maintenance: totalMaint,
                net: totalGross - totalMaint
            }
        };

        const mgrMaintMap = mgrMaintRaw[0].reduce((acc, r) => { acc[r.name] = Number(r.maint); return acc; }, {});
        
        const managers = managersRaw[0].map(m => {
            const managerName = m.name ? m.name.toUpperCase() : 'UNASSIGNED';
            const cap = MANAGER_CAPS[managerName] || 1;
            const mTrips = Number(m.total_trips || 0);
            const mActive = Number(m.active_trucks || 0);
            
            const maint = mgrMaintMap[managerName] || 0;
            const netProfit = Number(m.gross_profit || 0) - maint;

            return {
                name: managerName, capacity: cap,
                active_trucks: mActive,
                utilization_pct: Math.round((mActive / cap) * 100),
                total_trips: mTrips,
                trip_share: totalTrips > 0 ? Math.round((mTrips / totalTrips) * 100) : 0,
                t_t: mActive > 0 ? (mTrips / mActive).toFixed(1) : "0.0",
                profit: netProfit,
                avg_profit: mActive > 0 ? (netProfit / mActive) : 0
            };
        }).sort((a, b) => b.profit - a.profit);

        const brands = brandsRaw[0].map(b => {
            const brandName = b.name ? b.name.toUpperCase() : 'UNKNOWN';
            const cap = BRAND_CAPS[brandName] || 1;
            const bTrips = Number(b.total_trips || 0);
            const bActive = Number(b.active_trucks || 0);
            return {
                name: brandName, capacity: cap,
                active_trucks: bActive,
                utilization_pct: Math.round((bActive / cap) * 100),
                total_trips: bTrips,
                trip_share: totalTrips > 0 ? Math.round((bTrips / totalTrips) * 100) : 0,
                t_t: bActive > 0 ? (bTrips / bActive).toFixed(1) : "0.0"
            };
        });

        const topVolume = topVolumeRaw[0];

        const truckMaintMap = truckMaintRaw[0].reduce((acc, r) => { acc[r.truck_number] = Number(r.maint); return acc; }, {});
        
        const topProfit = trucksRaw[0].map(t => {
            const maint = truckMaintMap[t.truck_number] || 0;
            return {
                truck_number: t.truck_number, fm: t.fm, trips: t.trips,
                it_profit: Number(t.it_profit), non_it_profit: Number(t.non_it_profit),
                maintenance: maint, net_profit: Number(t.gross_profit) - maint
            };
        }).sort((a, b) => b.net_profit - a.net_profit).slice(0, 10);

        return { summary, managers, brands, topVolume, topProfit };

    } catch (error) {
        console.error("Database Custom Range Error:", error);
        throw new Error("Failed to query custom range analytics from database.");
    }
};

export const getMaintenanceDashboardData = async (startDate, endDate) => {
    try {
        const start = `${startDate} 00:00:00`;
        const end = `${endDate} 23:59:59`;

        const [
            kpiRaw, mostExpensiveRaw, trendRaw, brandRaw, 
            categoryRaw, topOffendersRaw, ledgerRaw
        ] = await Promise.all([
            pool.query(`SELECT COALESCE(SUM(amount), 0) as total_spend, COUNT(record_id) as total_incidents FROM maintenance_logs WHERE maintenance_date BETWEEN ? AND ?`, [start, end]),
            pool.query(`SELECT truck_number, SUM(amount) as truck_spend FROM maintenance_logs WHERE maintenance_date BETWEEN ? AND ? AND UPPER(TRIM(truck_number)) != 'NON-TRUCK' GROUP BY truck_number ORDER BY truck_spend DESC LIMIT 1`, [start, end]),
            pool.query(`SELECT DATE_FORMAT(maintenance_date, '%Y-%m-%d') as date, SUM(amount) as daily_spend FROM maintenance_logs WHERE maintenance_date BETWEEN ? AND ? GROUP BY date ORDER BY date ASC`, [start, end]),
            pool.query(`SELECT COALESCE(brand, 'UNKNOWN') as brand, SUM(amount) as brand_spend FROM maintenance_logs WHERE maintenance_date BETWEEN ? AND ? AND UPPER(TRIM(truck_number)) != 'NON-TRUCK' GROUP BY brand ORDER BY brand_spend DESC`, [start, end]),
            pool.query(`SELECT CASE WHEN UPPER(TRIM(truck_number)) = 'NON-TRUCK' THEN 'General/Yard (Non-Truck)' ELSE 'Direct Truck Repairs' END as category, SUM(amount) as category_spend FROM maintenance_logs WHERE maintenance_date BETWEEN ? AND ? GROUP BY category`, [start, end]),
            pool.query(`SELECT truck_number, COALESCE(MAX(brand), 'UNKNOWN') as brand, COUNT(record_id) as visit_count, SUM(amount) as total_spend FROM maintenance_logs WHERE maintenance_date BETWEEN ? AND ? AND UPPER(TRIM(truck_number)) != 'NON-TRUCK' GROUP BY truck_number ORDER BY total_spend DESC LIMIT 10`, [start, end]),
            pool.query(`SELECT DATE_FORMAT(maintenance_date, '%Y-%m-%d') as date, item_description, amount, UPPER(TRIM(truck_number)) as truck_number, fleet_name, COALESCE(brand, 'UNKNOWN') as brand FROM maintenance_logs WHERE maintenance_date BETWEEN ? AND ? ORDER BY maintenance_date DESC, amount DESC`, [start, end])
        ]);

        const kpi = kpiRaw[0][0] || { total_spend: 0, total_incidents: 0 };
        const mostExpensive = mostExpensiveRaw[0][0] || { truck_number: 'N/A', truck_spend: 0 };

        return {
            kpis: {
                total_spend: Number(kpi.total_spend),
                total_incidents: Number(kpi.total_incidents),
                avg_cost: kpi.total_incidents > 0 ? (Number(kpi.total_spend) / Number(kpi.total_incidents)) : 0,
                worst_truck: mostExpensive.truck_number,
                worst_truck_spend: Number(mostExpensive.truck_spend)
            },
            trends: trendRaw[0].map(t => ({ date: t.date, spend: Number(t.daily_spend) })),
            brandDistribution: brandRaw[0].map(b => ({ brand: b.brand, spend: Number(b.brand_spend) })),
            categorySplit: categoryRaw[0].map(c => ({ category: c.category, spend: Number(c.category_spend) })),
            topOffenders: topOffendersRaw[0].map(o => ({ truck_number: o.truck_number, brand: o.brand, visits: o.visit_count, spend: Number(o.total_spend) })),
            ledger: ledgerRaw[0].map(l => ({ date: l.date, item: l.item_description, amount: Number(l.amount), truck: l.truck_number, fleet: l.fleet_name, brand: l.brand }))
        };
    } catch (error) {
        console.error("Maintenance Service Error:", error);
        throw new Error("Failed to generate maintenance report.");
    }
};

export const fetchAllTrips = async () => {
    const [rows] = await pool.query('SELECT * FROM trips ORDER BY trip_date DESC');
    return rows;
};