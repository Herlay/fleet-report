import * as AnalyticsService from '../services/analytics.service.js';
import { generateRangeInsights } from '../services/insights.service.js';
import { generateDeepDiveReport } from '../services/ai.service.js'; 
import { generateMonthlyDeepDive } from '../services/monthlyAiService.js';
import { generateCustomRangeDeepDive } from '../services/customAiService.js';
import pool from '../config/db.js'; // Needed for the new capacity routes

const getWeekRange = (week) => {
    const start = week;
    const end = new Date(week);
    end.setDate(end.getDate() + 6);
    return { start, endStr: end.toISOString().split('T')[0] };
};

export const getDashboardMetrics = async (req, res) => {
    try {
        let { week } = req.query;

        if (!week) {
            const trends = await AnalyticsService.getTrends(1);
            if (trends.length > 0) {
                week = trends[0].week_start_date;
            } else {
                return res.status(200).json({ 
                    success: false, 
                    message: "No data available yet. Please upload a file." 
                });
            }
        }

        const { start, endStr } = getWeekRange(week);

        const [summary, managers, top_performers, topBrands] = await Promise.all([
            AnalyticsService.getWeeklySummary(week),
            AnalyticsService.getManagerRankings(week),
            AnalyticsService.getTopTrucks(start, endStr),
            AnalyticsService.getTopBrands(start, endStr)
        ]);

        res.json({
            success: true,
            period: week,
            summary, 
            managers,
            top_performers, 
            topBrands
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getTrendAnalysis = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 8;
        const trends = await AnalyticsService.getTrends(limit);
        res.json({ success: true, data: trends });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getInsights = async (req, res) => {
    try {
        const { startDate, endDate, week } = req.query;
        let insights;
        
        if (startDate && endDate) {
            insights = await generateRangeInsights(startDate, endDate);
        } else if (week) {
            const { start, endStr } = getWeekRange(week);
            insights = await generateRangeInsights(start, endStr);
        } else {
            return res.status(400).json({ error: "Date range required" });
        }
        
        res.json({ success: true, data: insights });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getCustomRangeData = async (req, res) => {
    try {
        const { startDate, endDate, groupBy } = req.query;

        let intervalFormat = '%Y-%m-%d';
        if (groupBy === 'month') intervalFormat = '%Y-%m';
        if (groupBy === 'week') intervalFormat = '%Y-%u';

        const [summary, trends, managers, top_performers, topBrands] = await Promise.all([
            AnalyticsService.getRangeSummary(startDate, endDate),
            AnalyticsService.getRangeTrends(startDate, endDate, intervalFormat),
            AnalyticsService.getRangeManagers(startDate, endDate),
            AnalyticsService.getTopTrucks(startDate, endDate),
            AnalyticsService.getTopBrands(startDate, endDate) 
        ]);

        res.json({
            success: true,
            summary, 
            trends,
            managers,
            top_performers,
            topBrands
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getWeeklyReportAI = async (req, res) => {
    try {
        const { startDate, endDate, absoluteWeek } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing date range for Intelligence Report." 
            });
        }

        console.log(`AI Analysis Triggered: ${startDate} to ${endDate} | Week: ${absoluteWeek || 'N/A'}`);
        
    
        const metrics = await AnalyticsService.getWeeklyReportMetrics(startDate, endDate, absoluteWeek);


        console.log("Generating Gemini Deep Dive...");
        const aiAnalysis = await generateDeepDiveReport(metrics);

        res.json({
            success: true,
            data: {
                metrics,     
                text: aiAnalysis 
            }
        });

    } catch (error) {
        console.error("AI Report Controller Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Intelligence Report generation failed.", 
            error: error.message 
        });
    }
};

export const getMonthlyReportController = async (req, res) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({ error: "Month and Year parameters are required." });
        }

        const reportData = await AnalyticsService.getMonthlyExecutiveReport(month, year);
        const formattedMonth = String(month).padStart(2, '0');
        const aiInsights = await generateMonthlyDeepDive(reportData, formattedMonth, year);

        res.status(200).json({
            ...reportData,
            ai_insights: aiInsights
        });

    } catch (error) {
        console.error("Monthly Controller Error:", error.message);
        res.status(500).json({ error: "Failed to generate monthly report." });
    }
};

export const getCustomReportController = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: "Start Date and End Date parameters are required." });
        }

        const reportData = await AnalyticsService.getCustomRangeReport(startDate, endDate);
        const cleanStartDate = String(startDate).trim();
        const cleanEndDate = String(endDate).trim();
        const aiInsights = await generateCustomRangeDeepDive(reportData, cleanStartDate, cleanEndDate);

        res.status(200).json({
            ...reportData,
            ai_insights: aiInsights
        });

    } catch (error) {
        console.error("Custom Range Controller Error:", error.message);
        res.status(500).json({ error: "Failed to generate custom range report." });
    }
};

export const getMaintenanceReportController = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ 
                success: false, 
                error: "Start Date and End Date are required." 
            });
        }

        const reportData = await AnalyticsService.getMaintenanceDashboardData(startDate, endDate);
    
        res.status(200).json({
            success: true,
            data: reportData
        });

    } catch (error) {
        console.error("Maintenance Controller Error:", error);
        res.status(500).json({ 
            success: false, 
            error: "Failed to fetch maintenance report." 
        });
    }
};

export const getAllTrips = async (req, res) => {
    try {
        const rows = await AnalyticsService.fetchAllTrips(); 
        res.json(rows);
    } catch (error) {
        console.error("Controller Error (getAllTrips):", error);
        res.status(500).json({ success: false, error: error.message });
    }
};


// ============================================================================
// --- NEW ADMIN FLEET CAPACITY CONTROLLERS ---
// ============================================================================

// 1. Get Current Capacities (To display on the Admin Page)
export const getCurrentCapacities = async (req, res) => {
    try {
        const sql = `
            SELECT c1.entity_type, c1.entity_name, c1.capacity, c1.effective_date
            FROM fleet_capacities c1
            INNER JOIN (
                SELECT entity_type, entity_name, MAX(effective_date) as max_date
                FROM fleet_capacities
                WHERE effective_date <= CURRENT_DATE()
                GROUP BY entity_type, entity_name
            ) c2 ON c1.entity_type = c2.entity_type 
                 AND c1.entity_name = c2.entity_name 
                 AND c1.effective_date = c2.max_date
            ORDER BY c1.entity_type DESC, c1.entity_name ASC
        `;
        const [rows] = await pool.query(sql);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error("Error fetching capacities:", error);
        res.status(500).json({ success: false, error: "Failed to fetch capacities." });
    }
};

// 2. Save a New Capacity Rule
export const updateFleetCapacity = async (req, res) => {
    try {
        const { effectiveDate, type, name, newCapacity } = req.body;

        if (!effectiveDate || !type || !name || newCapacity === undefined) {
            return res.status(400).json({ success: false, error: "Missing required fields." });
        }

        const sql = `
            INSERT INTO fleet_capacities (effective_date, entity_type, entity_name, capacity) 
            VALUES (?, ?, UPPER(TRIM(?)), ?)
            ON DUPLICATE KEY UPDATE capacity = VALUES(capacity)
        `;
        await pool.query(sql, [effectiveDate, type, name, newCapacity]);

        res.status(200).json({ success: true, message: "Capacity updated successfully!" });
    } catch (error) {
        console.error("Error updating capacity:", error);
        res.status(500).json({ success: false, error: "Failed to update fleet capacity." });
    }
};