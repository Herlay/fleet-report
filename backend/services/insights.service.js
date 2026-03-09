import pool from '../config/db.js';
import { 
    getRangeSummary, 
    getBrandStats, 
    getRouteStats 
} from './analytics.service.js'; 

const fmt = (num) => new Intl.NumberFormat('en-NG', { 
    style: 'currency', 
    currency: 'NGN', 
    maximumFractionDigits: 0 
}).format(num || 0);

export const generateRangeInsights = async (startDate, endDate) => {
    const insights = [];

    // --- 1. DATE CALCULATIONS ---
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = end - start;
    const prevEnd = new Date(start.getTime() - (24 * 60 * 60 * 1000)); 
    const prevStart = new Date(prevEnd.getTime() - duration);
    const prevStartStr = prevStart.toISOString().split('T')[0];
    const prevEndStr = prevEnd.toISOString().split('T')[0];

    // --- 2. DATA FETCHING ---
    const [curr, prev, routes] = await Promise.all([
        getRangeSummary(startDate, endDate),
        getRangeSummary(prevStartStr, prevEndStr),
        getRouteStats(startDate, endDate)  
    ]);

    // Helper to calculate yield specifically for Non-IT
    const getNonItYield = (data) => {
        const trips = Number(data.non_it_trips || 0);
        return trips > 0 ? Number(data.non_it_profit || 0) / trips : 0;
    };

    const currNonItProfit = Number(curr.non_it_profit || 0);
    const prevNonItProfit = Number(prev.non_it_profit || 0);
    const currYield = getNonItYield(curr);

    // --- 3. INSIGHT: PROFIT TREND (NON-IT ONLY) ---
    if (prevNonItProfit > 0) {
        const diff = currNonItProfit - prevNonItProfit;
        const pct = ((diff / prevNonItProfit) * 100).toFixed(1);
        
        if (Math.abs(pct) > 1) {
            insights.push({
                type: pct > 0 ? 'positive' : 'negative',
                title: 'Non-IT Profit Trend',
                text: `Non-IT net profit is **${pct > 0 ? 'up' : 'down'} ${Math.abs(pct)}%** (${fmt(Math.abs(diff))}) compared to the previous period.`
            });
        }
    }

    // --- 4. INSIGHT: EFFICIENCY (NON-IT YIELD) ---
    const prevYield = getNonItYield(prev);
    const yieldDiff = currYield - prevYield;

    if (Math.abs(yieldDiff) > 100) {
        insights.push({
            type: yieldDiff > 0 ? 'positive' : 'warning',
            title: 'Non-IT Trip Efficiency',
            text: `Profitability per Non-IT trip **${yieldDiff > 0 ? 'improved' : 'declined'}** by **${fmt(Math.abs(yieldDiff))}** per trip.`
        });
    }

    // --- 5. INSIGHT: TOP PERFORMING NON-IT TRIPS ---
    // Filter routes to exclude IT (contract) trips
    const nonItRoutes = (routes || []).filter(r => 
        r.is_it === false || r.type?.toLowerCase() === 'non-it' || r.is_contract === false
    );

    if (nonItRoutes.length > 0) {
        const bestRoute = nonItRoutes.sort((a, b) => b.total_profit - a.total_profit)[0];
        insights.push({
            type: 'positive',
            title: 'Top Non-IT Corridor',
            text: `**${bestRoute.route_name}** was the most lucrative corridor, contributing **${fmt(bestRoute.total_profit)}** in open-market profit.`
        });
    }

    // --- 6. INSIGHT: INACTIVE CAPACITY (OPPORTUNITY LOSS) ---
    const idleTrucks = Number(curr.total_fleet || 0) - Number(curr.active_trucks || 0);
    if (idleTrucks > 0 && currYield > 0) {
        const potentialLoss = idleTrucks * currYield;
        insights.push({
            type: 'negative',
            title: 'Inactive Truck Impact',
            text: `**${idleTrucks} trucks** were idle. At current Non-IT margins, this represents a potential lost opportunity of **${fmt(potentialLoss)}**.`
        });
    }

    return insights;
};