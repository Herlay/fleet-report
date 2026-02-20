import pool from '../config/db.js';
import { 
    getRangeSummary, 
    getRangeManagers, 
    getBrandStats, 
    getRouteStats 
} from './analytics.service.js'; 

const fmt = (num) => new Intl.NumberFormat('en-NG', { 
    style: 'currency', 
    currency: 'NGN', 
    maximumFractionDigits: 0 
}).format(num);

export const generateRangeInsights = async (startDate, endDate) => {
    const insights = [];
    console.log(`\n GENERATING INSIGHTS: ${startDate} to ${endDate}`);

    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = end - start;

    const prevEnd = new Date(start.getTime() - (24 * 60 * 60 * 1000)); 
    const prevStart = new Date(prevEnd.getTime() - duration);

    const prevStartStr = prevStart.toISOString().split('T')[0];
    const prevEndStr = prevEnd.toISOString().split('T')[0];

    console.log(`   - Comparing vs Previous Period: ${prevStartStr} to ${prevEndStr}`);

   
    const [curr, prev, brands, routes] = await Promise.all([
        getRangeSummary(startDate, endDate),
        getRangeSummary(prevStartStr, prevEndStr),
        getBrandStats(startDate, endDate), 
        getRouteStats(startDate, endDate)  
    ]);

    //Profits
    if (prev.total_profit > 0) {
        const diff = curr.total_profit - prev.total_profit;
        const pct = ((diff / prev.total_profit) * 100).toFixed(1);
        
        if (Math.abs(pct) > 1) {
            const trend = pct > 0 ? 'up' : 'down';
            const type = pct > 0 ? 'positive' : 'negative';
            insights.push({
                type,
                title: 'Profit Trend',
                text: `Net profit is **${trend} ${Math.abs(pct)}%** (${fmt(Math.abs(diff))}) compared to the previous period.`
            });
        }
    }

    // Idle Trucks
    const idleTrucks = curr.total_fleet - curr.active_trucks;
    if (idleTrucks > 0) {
        insights.push({
            type: 'negative',
            title: 'Inactive Trucks',
            text: `**${idleTrucks} trucks** were completely inactive during this period. Potential lost revenue: **${fmt(idleTrucks * curr.avg_profit_per_trip)}**.`
        });
    }

    // Cost Per Trip
    const getCostPerTrip = (data) => {
        if (!data || data.total_trips === 0) return 0;
        return (Number(data.total_expenses) + Number(data.total_maintenance)) / data.total_trips;
    };
    const currCPT = getCostPerTrip(curr);
    const prevCPT = getCostPerTrip(prev);
    const costDiff = currCPT - prevCPT;

    if (Math.abs(costDiff) > 500) {
        if (costDiff > 0) {
            insights.push({
                type: 'warning',
                title: 'Rising Costs',
                text: `Average cost per trip increased by **${fmt(costDiff)}** vs previous period.`
            });
        } else {
            insights.push({
                type: 'positive',
                title: 'Efficiency Gain',
                text: `Average cost per trip improved (dropped) by **${fmt(Math.abs(costDiff))}**.`
            });
        }
    }

    // Trips Trend
    if (routes.length > 0) {
        const bestRoute = routes[0];
        insights.push({
            type: 'positive',
            title: 'Top Performing Trips',
            text: `**${bestRoute.route_name}** was the most profitable corridor, generating **${fmt(bestRoute.total_profit)}**.`
        });
    }

    return insights;
};