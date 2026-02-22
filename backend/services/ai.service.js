import { GoogleGenerativeAI } from "@google/generative-ai";
import pool from '../config/db.js'; 
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateDeepDiveReport = async (data) => {
   
    const weekId = `deep_dive_wk${data.absoluteWeek}_${data.weekLabel.replace(/\s+/g, '_')}`;

    try {
       
        const [cached] = await pool.query("SELECT ai_content FROM report_cache WHERE week_identifier = ?", [weekId]);
        if (cached.length > 0) return JSON.parse(cached[0].ai_content);

      
        const modelName = "gemini-2.5-flash"; 
        const fmt = (val) => new Intl.NumberFormat('en-NG', { 
            style: 'currency', currency: 'NGN', maximumFractionDigits: 0 
        }).format(val || 0);

        const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: { responseMimeType: "application/json" }
        });

    
        const prompt = `
            You are a Senior Fleet Intelligence Analyst. Write a data-driven professional performance report for Week ${data.absoluteWeek}.
            
            REPORT DATA SECTIONS:
            1. OVERALL ACTIVITY:
               - Trips: ${data.trips_breakdown?.total} (Revenue: ${data.trips_breakdown?.non_it}, Internal/IT: ${data.trips_breakdown?.it})
               - Fleet: ${data.trucks_insight?.total} Unique Trucks. 
               - Deployment: ${data.trucks_insight?.onlyRevenue} Revenue-only units, ${data.trucks_insight?.onlyIT} IT-only units, ${data.trucks_insight?.doubleDuty} Double-Duty units.
               - Utilization: ${data.utilization}% | T/T Efficiency: ${data.avgTripPerTruck}.

            2. FINANCIALS:
               - Gross Profit: ${fmt(data.grossProfit)}
               - Maintenance: ${fmt(data.maintenance)}
               - Net Profit: ${fmt(data.netProfit)}

            3. TREND ANALYSIS (4-Week History):
               - ${data.trends?.map(t => `${t.week}: ${t.trips} trips, ${fmt(t.profit)} net profit`).join(' | ')}

            4. BRAND WoW & FIXED CAPACITY (90 Total Fleet):
               - ${data.brandWoW?.map(b => `${b.name}: ${b.trips} trips (${b.wow} WoW), ${b.utilization}% Utilized`).join(' | ')}

            5. TOP PERFORMANCE TABLES:
               - Volume Leaders (Trips): ${data.topVolume?.slice(0,3).map(t => `${t.id} (${t.trips} trips)`).join(', ')}
               - Non-IT Profit Leaders: ${data.topNonItProfit?.slice(0,3).map(t => `${t.id} (${fmt(t.profit)})`).join(', ')}
               - IT Profit Leaders: ${data.topItProfit?.slice(0,3).map(t => `${t.id} (${fmt(t.profit)})`).join(', ')}

            INSTRUCTIONS:
            - Executive Summary: Brief high-level overview. Mention the "Double-Duty" efficiency.
            - Brand Insights: Analyze brand utilization against fixed capacities (Howo 30, Iveco 23, Mack 25, MAN TGA 12).
            - Volume Insights: Comment on the fleet workhorses and operational frequency.
            - Profit Insights: Compare Revenue (Non-IT) profitability vs IT cost/benefit performance.
            - Projection: Predict next week based on T/T efficiency and WoW growth.

            RETURN JSON ONLY:
            {
                "executive_summary": "...",
                "brand_insights": "...",
                "volume_insights": "...",
                "profit_insights": "...",
                "projection": "..."
            }
        `;

        const result = await model.generateContent(prompt);
        const aiResponse = JSON.parse(result.response.text());

    
        await pool.query("INSERT INTO report_cache (week_identifier, ai_content) VALUES (?, ?)", 
            [weekId, JSON.stringify(aiResponse)]
        );

        return aiResponse;

    } catch (error) {
        console.error("AI Service Error:", error.message);
    
        return { 
            executive_summary: `Operational overview for Week ${data.absoluteWeek} showing ${data.trips_breakdown?.total || 0} total movements.`,
            brand_insights: "Brand performance is tracking within expected utilization parameters across the 90-unit fleet.",
            volume_insights: "Top trucks are maintaining consistent trip frequency to support demand.",
            profit_insights: "Profitability is driven by high-margin Non-IT jobs and efficient internal transfers.",
            projection: "Continued operational stability is forecasted for the next cycle."
        };
    }
};