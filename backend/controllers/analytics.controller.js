import * as AnalyticsService from '../services/analytics.service.js';
import { generateRangeInsights } from '../services/insights.service.js';
import { generateDeepDiveReport } from '../services/ai.service.js'; // <--- THIS LINE IS THE FIX


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

export const getAllTrips = async (req, res) => {
    try {
        const rows = await AnalyticsService.fetchAllTrips(); 
        res.json(rows);
    } catch (error) {
        console.error("Controller Error (getAllTrips):", error);
        res.status(500).json({ success: false, error: error.message });
    }
};