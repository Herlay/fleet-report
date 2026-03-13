import { GoogleGenerativeAI } from "@google/generative-ai";
import pool from '../config/db.js'; 
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateCustomRangeDeepDive = async (data, startDate, endDate) => {
    // Unique caching ID for this exact date range
    const rangeId = `deep_dive_custom_${startDate}_to_${endDate}`;

    try {
        // 1. Check Cache first
        const [cached] = await pool.query("SELECT ai_content FROM report_cache WHERE week_identifier = ?", [rangeId]);
        if (cached.length > 0) return JSON.parse(cached[0].ai_content);

        const modelName = "gemini-2.5-flash"; 
        const fmt = (val) => new Intl.NumberFormat('en-NG', { 
            style: 'currency', currency: 'NGN', maximumFractionDigits: 0 
        }).format(val || 0);

        const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: { responseMimeType: "application/json" }
        });

        // 2. Prepare concise data strings
        const summaryStr = `Trips: ${data.summary.total_inhouse_trips}. Utilization: ${data.summary.utilization_pct}%. T/T: ${data.summary.avg_tt}. Net Profit: ${fmt(data.summary.financials.net)}`;
        const managersStr = data.managers.map(m => `${m.name}: ${m.t_t} T/T, ${m.total_trips} trips, ${fmt(m.profit)} profit`).join(' | ');
        const brandStr = data.brands.map(b => `${b.name}: ${b.total_trips} trips (${b.trip_share}% of total), ${b.utilization_pct}% Utilized, ${b.t_t} T/T`).join(' | ');
        
        const topVolumeStr = data.topVolume.slice(0, 3).map(t => `${t.truck_number} (${t.driver}, ${t.trips} trips)`).join(', ');
        const topProfitStr = data.topProfit.slice(0, 3).map(t => `${t.truck_number} (${fmt(t.net_profit)})`).join(', ');

        // 3. The Prompt for Custom Dates
        const prompt = `
            You are a Senior Fleet Intelligence Analyst. Write a data-driven professional performance report for the custom period from ${startDate} to ${endDate}.
            Do NOT make any future projections or historical MoM/WoW comparisons, as this is a custom date range. Focus entirely on the absolute performance numbers provided.
            
            DATA SUMMARY:
            - OVERALL: ${summaryStr}
            - MANAGERS: ${managersStr}
            - BRANDS: ${brandStr}
            - TOP PERFORMERS: Volume Leaders: ${topVolumeStr}. Profit Leaders: ${topProfitStr}.

            INSTRUCTIONS:
            - executive_summary: A brief high-level overview of the period's total trip volume, fleet utilization, and absolute net profit.
            - manager_insights: Highlight which fleet manager generated the most profit and who had the best T/T (Trips per Truck) efficiency during this specific window.
            - brand_insights: Analyze brand volume and efficiency. Identify the primary workhorse brand for this period.
            - top_performer_insights: Highlight the elite trucks and drivers that dominated this specific timeframe.

            RETURN JSON ONLY IN THIS EXACT FORMAT:
            {
                "executive_summary": "...",
                "manager_insights": "...",
                "brand_insights": "...",
                "top_performer_insights": "..."
            }
        `;

        const result = await model.generateContent(prompt);
        const aiResponse = JSON.parse(result.response.text());

        // 4. Save to Cache
        await pool.query("INSERT INTO report_cache (week_identifier, ai_content) VALUES (?, ?)", 
            [rangeId, JSON.stringify(aiResponse)]
        );

        return aiResponse;

    } catch (error) {
        console.error("AI Custom Range Service Error:", error.message);
        
        return { 
            executive_summary: `Operational overview for the period from ${startDate} to ${endDate}, indicating ${data.summary?.total_inhouse_trips || 0} total trips.`,
            manager_insights: "Manager performance data for this custom range is currently under review.",
            brand_insights: "Brand utilization data for this custom range is currently under review.",
            top_performer_insights: "Top performer data for this custom range is currently under review."
        };
    }
};