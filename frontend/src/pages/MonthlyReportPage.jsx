import React, { useState, useEffect } from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000' }); // Adjust to your backend URL

const formatNaira = (num) => `₦${(num / 1000000).toFixed(1)}M`;
const formatNairaFull = (num) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(num || 0);

const MonthlyReportDashboard = () => {
    const [selectedMonth, setSelectedMonth] = useState("2026-01"); // Default to Jan 2026
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchReport();
    }, [selectedMonth]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const [year, month] = selectedMonth.split('-');
            const response = await api.get('/api/analytics/monthly-report', {
                params: { month, year }
            });
            setData(response.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !data) return <div className="p-10 text-center font-bold">Loading Report...</div>;

    const { summary, trends, managers, brands, brandTrends, topVolume, topProfit, reportMonth } = data;
    
    const renderTrendRow = (label, key, data, isProfit = false) => {
    return (
        <tr>
            <td className="p-2 border font-bold text-left bg-gray-50">{label}</td>
            {/* Render the Raw Values */}
            {data.map((t, i) => (
                <td key={i} className="p-2 border">
                    {isProfit ? (t[key] / 1000000).toFixed(1) : t[key]}
                </td>
            ))}
            {/* Render the % Change Values */}
            {data.map((t, i) => {
                if (i === 0) return null;
                const current = parseFloat(t[key]);
                const previous = parseFloat(data[i - 1][key]);
                const change = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : 0;
                
                return (
                    <td key={`pct-${i}`} className={`p-2 border font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change > 0 ? '+' : ''}{change.toFixed(0)}%
                    </td>
                );
            })}
        </tr>
    );
};

    return (
        <div className="max-w-6xl mx-auto p-8 bg-white text-gray-800 font-sans shadow-lg my-6">
            
            {/* Header & Exec Summary */}
            <div className="border-b-2 border-gray-800 pb-4 mb-6">
                <input 
                    type="month" 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="mb-4 border p-2 rounded no-print"
                />
                <h1 className="text-3xl font-black uppercase flex items-center gap-2">
                    📃 MONTHLY Performance Report {reportMonth}
                </h1>
                <h2 className="text-xl font-bold mt-4">Executive Summary</h2>
                <p className="mt-2 text-sm leading-relaxed">
                    This report provides an overview of fleet performance across four Brands — HOWO, IVECO, MAN TGA, and MACK for the past four months. It focuses on key metrics such as Trips, revenue, profit and fleet utilization. The analysis highlights trends, identifies areas for improvement, and offers recommendations to enhance operational efficiency and profitability.
                </p>
            </div>

            {/* Overall Fleet Performance */}
            <h3 className="text-lg font-bold mb-3">🚚 Overall Fleet Performance For {reportMonth.split(' ')[0]}</h3>
            <table className="w-full text-left border-collapse mb-4 text-sm">
                <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                        <th className="p-2">Metric</th>
                        <th className="p-2">{reportMonth.split(' ')[0]}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-b"><td className="p-2">Total Trips By Inhouse</td><td className="p-2 font-bold">{summary.total_inhouse_trips}</td></tr>
                    <tr className="border-b"><td className="p-2">Trips Growth</td><td className="p-2">{summary.trips_growth_val > 0 ? '+' : ''}{summary.trips_growth_val} ({summary.trips_growth_pct}%)</td></tr>
                    <tr className="border-b"><td className="p-2">Active Inhouse Trucks</td><td className="p-2">{summary.active_trucks}</td></tr>
                    <tr className="border-b"><td className="p-2">Overall Fleet Utilization</td><td className="p-2">{summary.utilization_pct}%</td></tr>
                    <tr className="border-b"><td className="p-2">Average Trip per Truck (T/T)</td><td className="p-2">{summary.avg_tt}</td></tr>
                   </tbody>
            </table>

            <div className="bg-blue-50 p-4 rounded text-sm mb-8">
                <strong>Observations:</strong> For {reportMonth.split(' ')[0]}, our in-house fleet successfully completed {summary.total_inhouse_trips} trips, utilizing {summary.active_trucks} active trucks. An additional {summary.it_only_trucks} trucks were deployed for IT-related tasks Only.<br/><br/>
                <strong>Financial Performance:</strong><br/>
                ● Gross Profit: {formatNaira(summary.financials.gross)}<br/>
                ● Maintenance Spend: {formatNaira(summary.financials.maintenance)}<br/>
                ● Net Profit: {formatNaira(summary.financials.net)}
            </div>

          {/* Trend Analysis Table */}
<h3 className="text-lg font-bold mb-3">📈 Trip Volume and Profit Trend Analysis (Non-IT)</h3>
<table className="w-full text-center border-collapse mb-8 text-sm border">
    <thead>
        <tr className="bg-gray-800 text-white">
            <th className="p-2 border text-left">Metric</th>
            {/* Monthly Data Columns */}
            {trends.map(t => <th key={t.month_label} className="p-2 border">{t.month_label}</th>)}
            {/* Dynamic % Change Columns */}
            {trends.map((t, i) => {
                if (i === 0) return null; // Can't calculate change for the first month
                return (
                    <th key={`change-${i}`} className="p-2 border text-xs bg-gray-700">
                        % Change ({trends[i-1].month_label}→{t.month_label})
                    </th>
                );
            })}
        </tr>
    </thead>
    <tbody>
        {/* Helper function to render a row with its monthly values and calculated % changes */}
        {renderTrendRow("Total Trips", "trips", trends)}
        {renderTrendRow("Active Trucks", "active_trucks", trends)}
        {renderTrendRow("Trips per Truck (T/T)", "t_t", trends)}
        {renderTrendRow("Net Profit (M)", "net_profit", trends, true)}
    </tbody>
</table>

            {/* Fleet Manager Insight */}
            <h3 className="text-lg font-bold mb-3">👥 Fleet Manager Insight – {reportMonth} (This Include IT Trips)</h3>
           <table className="w-full text-center border-collapse mb-8 text-sm border">
    <thead>
        <tr className="bg-gray-100 text-gray-700">
            <th className="p-2 border">Fleet Managers (Trucks)</th>
            <th className="p-2 border">Active Trucks</th>
            <th className="p-2 border">% Utilization</th>
            <th className="p-2 border">Total Trips</th>
            <th className="p-2 border">% Total Trips</th>
            <th className="p-2 border">T/T Efficiency</th>
            <th className="p-2 border">% Met Target (3+)</th>
            <th className="p-2 border">Net Profit</th>
            <th className="p-2 border">Avg Profit/Truck</th>
        </tr>
    </thead>
    <tbody>
        {managers.map((m, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
                <td className="p-2 border font-bold text-left">{m.name} ({m.capacity})</td>
                <td className="p-2 border">{m.active_trucks}</td>
                <td className="p-2 border">{m.utilization_pct}%</td>
                <td className="p-2 border">{m.total_trips}</td>
                <td className="p-2 border">{m.trip_share}%</td>
                <td className="p-2 border font-mono">{m.t_t}</td>
                <td className={`p-2 border font-bold ${m.target_pct < 30 ? 'text-red-500' : 'text-green-600'}`}>
                    {m.target_pct}%
                </td>
                <td className="p-2 border font-bold">{formatNaira(m.profit)}</td>
                <td className="p-2 border italic">{formatNaira(m.avg_profit)}</td>
            </tr>
        ))}
    </tbody>
</table>
            {/* Brand Performance Breakdown */}
            <h3 className="text-lg font-bold mb-3">🚚 Brand Performance Breakdown: Utilization and Efficiency</h3>
            <table className="w-full text-center border-collapse mb-8 text-sm">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="p-2 border">Brand (Total Trucks)</th>
                        <th className="p-2 border">Active Trucks</th>
                        <th className="p-2 border">% of Utilized Trucks</th>
                        <th className="p-2 border">Total Trips</th>
                        <th className="p-2 border">% of Total Trips</th>
                        <th className="p-2 border">T/T Efficiency</th>
                    </tr>
                </thead>
                <tbody>
                    {brands.map((b, idx) => (
                        <tr key={idx} className="border-b">
                            <td className="p-2 border font-bold text-left">{b.name} ({b.capacity})</td>
                            <td className="p-2 border">{b.active_trucks}</td>
                            <td className="p-2 border">{b.utilization_pct}%</td>
                            <td className="p-2 border">{b.total_trips}</td>
                            <td className="p-2 border">{b.trip_share}%</td>
                            <td className="p-2 border">{b.t_t}</td>
                        </tr>
                    ))}
                    <tr className="bg-gray-100 font-bold">
    <td className="p-2 border text-left">TOTAL (90)</td>
    {/* Non-IT Active Trucks from Summary */}
    <td className="p-2 border">{summary.active_trucks}</td> 
    {/* Non-IT Utilization from Summary */}
    <td className="p-2 border">{summary.utilization_pct}%</td>
    {/* Non-IT Total Trips */}
    <td className="p-2 border">{summary.total_inhouse_trips}</td>
    <td className="p-2 border">100%</td>
    {/* Non-IT T/T Efficiency */}
    <td className="p-2 border">{summary.avg_tt}</td>
</tr>
                </tbody>
            </table>

    {/* Trips WoW Change by Brand */}
<h3 className="text-lg font-bold mb-3">📈 Trips WoW Change by Brand</h3>
<table className="w-full text-center border-collapse mb-8 text-xs border">
    <thead>
        <tr className="bg-gray-200 text-gray-700">
            <th className="p-2 border font-bold">Brand</th>
            
            {/* 1. Dynamic Month Columns (e.g., Oct, Nov, Dec, Jan) */}
            {brandTrends[0]?.monthlyData.map((m, i) => (
                <th key={`month-${i}`} className="p-2 border font-bold">
                    {m.label} Trips / (Trucks)
                </th>
            ))}
            
            {/* 2. Dynamic Change Columns (e.g., Nov vs Oct) */}
            {brandTrends[0]?.monthlyData.map((m, i) => {
                if (i === 0) return null; // Skip first month comparison
                const currentMonth = m.label;
                const previousMonth = brandTrends[0].monthlyData[i - 1].label;
                return (
                    <th key={`label-${i}`} className="p-2 border font-bold bg-gray-100">
                        % Change ({currentMonth} vs {previousMonth})
                    </th>
                );
            })}
        </tr>
    </thead>
    <tbody>
        {brandTrends.map((bt, idx) => (
            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                {/* Brand Name */}
                <td className="p-2 border font-bold text-left bg-gray-50">
                    {bt.brand}
                </td>

                {/* Data Columns (Trips / Trucks) */}
                {bt.monthlyData.map((m, i) => (
                    <td key={`data-${i}`} className="p-2 border text-black-600">
                        {m.display}
                    </td>
                ))}

                {/* Percentage Change Columns with Logic */}
                {bt.changes.map((change, i) => {
                    if (i === 0) return null;
                    
                    const isNegative = change?.includes('-');
                    const numericValue = parseInt(change?.replace(/[^0-9-]/g, '')) || 0;
                    
                    // Highlight logic: Green if positive, Red if negative
                    // Extra highlight: light green background if growth > 20%
                    const textClass = isNegative ? 'text-red-600' : 'text-green-600';
                    const bgClass = (!isNegative && numericValue >= 20) ? 'bg-green-50' : '';

                    return (
                        <td 
                            key={`change-${i}`} 
                            className={`p-2 border font-black ${textClass} ${bgClass}`}
                        >
                            {change}
                        </td>
                    );
                })}
            </tr>
        ))}
    </tbody>
</table>
            {/* Top Performers */}
            <h3 className="text-lg font-bold mb-3">🏅 TOP PERFORMERS (Trips)</h3>
            <table className="w-full text-left border-collapse mb-8 text-sm">
                <thead>
                    <tr className="bg-gray-800 text-white">
                        <th className="p-2 border">TRUCK NO</th>
                        <th className="p-2 border">Brand</th>
                        <th className="p-2 border">Trips</th>
                        <th className="p-2 border">Drivers Name</th>
                        <th className="p-2 border">Fleet Manager</th>
                    </tr>
                </thead>
                <tbody>
                    {topVolume.map((t, idx) => (
                        <tr key={idx} className="border-b">
                            <td className="p-2 border font-bold">{t.truck_number}</td>
                            <td className="p-2 border">{t.brand}</td>
                            <td className="p-2 border">{t.trips}</td>
                            <td className="p-2 border">{t.driver}</td>
                            <td className="p-2 border">{t.fm}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <h3 className="text-lg font-bold mb-3">🏅 TOP PERFORMERS (Net Profit)</h3>
            <table className="w-full text-right border-collapse mb-8 text-sm">
                <thead>
                    <tr className="bg-green-800 text-white text-xs">
                        <th className="p-2 border text-left">TRUCK NO</th>
                        <th className="p-2 border">IT</th>
                        <th className="p-2 border">NON - IT</th>
                        <th className="p-2 border">Grand Total</th>
                        <th className="p-2 border text-center">Trips</th>
                        <th className="p-2 border text-left">FM</th>
                        <th className="p-2 border text-red-300">Maintenance</th>
                        <th className="p-2 border">Net Profit</th>
                    </tr>
                </thead>
                <tbody>
                    {topProfit.map((t, idx) => (
                        <tr key={idx} className="border-b">
                            <td className="p-2 border font-bold text-left">{t.truck_number}</td>
                            <td className="p-2 border">{t.it_profit > 0 ? formatNairaFull(t.it_profit) : '-'}</td>
                            <td className="p-2 border">{formatNairaFull(t.non_it_profit)}</td>
                            <td className="p-2 border font-bold">{formatNairaFull(t.grand_total)}</td>
                            <td className="p-2 border text-center">{t.trips}</td>
                            <td className="p-2 border text-left">{t.fm}</td>
                            <td className="p-2 border text-red-600">{t.maintenance > 0 ? formatNairaFull(t.maintenance) : '-'}</td>
                            <td className="p-2 border font-black text-green-700">{formatNairaFull(t.net_profit)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
        </div>
    );
};

export default MonthlyReportDashboard;