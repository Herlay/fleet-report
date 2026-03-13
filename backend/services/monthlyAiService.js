import { GoogleGenerativeAI } from "@google/generative-ai";
import pool from '../config/db.js'; 
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateMonthlyDeepDive = async (data, month, year) => {
    const monthId = `deep_dive_mo_${month}_${year}`;

    try {
        // 1. Check Cache first
        const [cached] = await pool.query("SELECT ai_content FROM report_cache WHERE week_identifier = ?", [monthId]);
        if (cached.length > 0) return JSON.parse(cached[0].ai_content);

        const modelName = "gemini-2.5-flash"; 
        const fmt = (val) => new Intl.NumberFormat('en-NG', { 
            style: 'currency', currency: 'NGN', maximumFractionDigits: 0 
        }).format(val || 0);

        const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: { responseMimeType: "application/json" }
        });

        // 2. Prepare concise data strings for the AI to read
        const summaryStr = `Trips: ${data.summary.total_inhouse_trips} (${data.summary.trips_growth_pct}% MoM). Utilization: ${data.summary.utilization_pct}%. T/T: ${data.summary.avg_tt}. Net Profit: ${fmt(data.summary.financials.net)}`;
        const managersStr = data.managerTrends.map(m => `${m.manager}: ${m.t_t} T/T, ${m.change} trip change MoM, ${fmt(m.profit)} profit`).join(' | ');
        
        // FIXED: Feed actual volume and efficiency data to the AI instead of just MoM %
        const brandStr = data.brands.map(b => `${b.name}: ${b.total_trips} trips (${b.trip_share}% of total), ${b.utilization_pct}% Utilized, ${b.t_t} T/T`).join(' | ');
        
        const topVolumeStr = data.topVolume.slice(0, 3).map(t => `${t.truck_number} (${t.driver}, ${t.trips} trips)`).join(', ');
        const topProfitStr = data.topProfit.slice(0, 3).map(t => `${t.truck_number} (${fmt(t.net_profit)})`).join(', ');

        // 3. The Prompt (Strict instructions against 0% hallucination)
        const prompt = `
            You are a Senior Fleet Intelligence Analyst. Write a data-driven professional performance report for ${data.reportMonth}.
            Do NOT make any future projections or forecasts. Focus purely on explaining the current month's data, making sense of the numbers for executives.
            
            MONTHLY DATA SUMMARY:
            - OVERALL: ${summaryStr}
            - MANAGERS: ${managersStr}
            - BRANDS: ${brandStr}
            - TOP PERFORMERS: Volume Leaders: ${topVolumeStr}. Profit Leaders: ${topProfitStr}.

            INSTRUCTIONS:
            - executive_summary: A brief high-level overview of the month's overall trip volume, fleet utilization, and net profit. Explain what these numbers indicate about the fleet's overall health this month.
            - manager_insights: Highlight which fleet manager performed best and who struggled. Explain how their T/T efficiency (Trips per Truck) impacted their profitability.
            - brand_insights: Analyze brand reliability and volume. Identify which brand is the "workhorse" carrying the most load, and which is the most/least efficient based on T/T. IMPORTANT: If MoM change is 0%, it means there is no historical data yet—do NOT praise 0% as "consistent reliability". Just focus on the current volume and efficiency.
            - top_performer_insights: Highlight the elite trucks and drivers. Explain the value these high-performing assets brought to the overall fleet this month.

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
            [monthId, JSON.stringify(aiResponse)]
        );

        return aiResponse;

    } catch (error) {
        console.error("AI Monthly Service Error:", error.message);
        
        return { 
            executive_summary: `Operational overview for ${data.reportMonth} indicating ${data.summary?.total_inhouse_trips || 0} total trips.`,
            manager_insights: "Manager performance data currently under review.",
            brand_insights: "Brand utilization data currently under review.",
            top_performer_insights: "Top performer data currently under review."
        };
    }
};