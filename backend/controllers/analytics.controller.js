import * as AnalyticsService from '../services/analytics.service.js';
import { generateRangeInsights } from '../services/insights.service.js';
import { generateDeepDiveReport } from '../services/ai.service.js'; 
import { generateMonthlyDeepDive } from '../services/monthlyAiService.js';
import { generateCustomRangeDeepDive } from '../services/customAiService.js';


// Fixed capacities for your fleet
const MANAGER_CAPACITY = {
    'MICHAEL': 30,
    'BENJAMIN': 35,
    'FATAI': 25
};

const BRAND_CAPACITY = {
    'HOWO': 30,
    'IVECO': 23,
    'MACK': 25,
    'MAN TGA': 12
};

const TOTAL_FLEET_SIZE = 90;

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

        // 1. Fetch the raw structured data from your database service
        const reportData = await AnalyticsService.getMonthlyExecutiveReport(month, year);

        // 2. Format the month to ensure it's always 2 digits (e.g., '1' becomes '01') for the cache ID
        const formattedMonth = String(month).padStart(2, '0');

        // 3. Pass the data to the AI Service to generate the insights
        const aiInsights = await generateMonthlyDeepDive(reportData, formattedMonth, year);

        // 4. Merge the AI insights into the final payload and send to the frontend
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

        // 1. Fetch from Database using the correctly named service function
        const reportData = await AnalyticsService.getCustomRangeReport(startDate, endDate);

        // 2. Call AI
        const cleanStartDate = String(startDate).trim();
        const cleanEndDate = String(endDate).trim();
        const aiInsights = await generateCustomRangeDeepDive(reportData, cleanStartDate, cleanEndDate);

        // 3. THIS WAS MISSING! Send the response back to React.
        res.status(200).json({
            ...reportData,
            ai_insights: aiInsights
        });

    } catch (error) {
        console.error("Custom Range Controller Error:", error.message);
        res.status(500).json({ error: "Failed to generate custom range report." });
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

// export const getReportController = async (req,res)=>{

//     try{

//         const { startDate, endDate, absoluteWeek } = req.body;

//         let result;

//         if(absoluteWeek){
//             result = await getWeeklyReportMetrics(
//                 startDate,
//                 endDate,
//                 absoluteWeek
//             );
//         }
//         else{
//             result = await getRangeReportMetrics(
//                 startDate,
//                 endDate
//             );
//         }

//         res.json({
//             success:true,
//             data:result
//         });

//     }catch(error){
//         console.error(error);
//         res.status(500).json({
//             success:false,
//             message:"Report generation failed"
//         });
//     }

// };