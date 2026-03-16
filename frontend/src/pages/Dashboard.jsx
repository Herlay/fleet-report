import React, { useState, useMemo, useCallback } from 'react';

import { 
  Banknote, Truck, Activity, TrendingUp, Download,
  Lightbulb, TrendingDown, AlertTriangle, CheckCircle, User, Loader2, Info 
} from 'lucide-react';
import KpiCard from '../components/KpiCard';
import ChartCard from '../components/ChartCard';
import FilterBar from '../components/FilterBar'; 
import { getRangeData, getInsightsData } from '../services/api';

// --- CUSTOM TOOLTIP COMPONENT ---
const SectionTooltip = ({ text }) => (
  <div className="relative flex items-center group cursor-help inline-flex ml-2">
    <Info size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
    {/* Notice the z-index here is now just high enough to float over the chart content, but not the whole app */}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 sm:w-56 p-2.5 bg-slate-800 text-white text-[11px] leading-relaxed rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[30] text-center font-normal shadow-xl normal-case tracking-normal">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
    </div>
  </div>
);

// --- TOOLTIP CHART HEADER (MOBILE RESPONSIVE FIX) ---
const TooltipHeader = ({ title, tooltipText }) => (
  // Removed high z-index from this wrapper
  <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 mb-4 absolute top-5 left-6 right-6 z-10 pointer-events-none">
     <div className="w-full flex justify-end sm:justify-between pointer-events-auto">
        <span className="hidden sm:inline"></span>
        <SectionTooltip text={tooltipText} />
     </div>
  </div>
);


const Dashboard = () => {   
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentRangeLabel, setCurrentRangeLabel] = useState('');

  // --- MANUAL COMPACT FORMATTING ---
  const formatCompactNumber = (number) => {
    if (number === null || number === undefined || isNaN(number)) return "₦0";
    
    const num = Number(number);
    if (num >= 1e9) return `₦${(num / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
    if (num >= 1e6) return `₦${(num / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
    if (num >= 1e3) return `₦${(num / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
    
    return `₦${num.toLocaleString('en-NG')}`;
  };

  const managerData = useMemo(() => {
    if (!data?.managers || data.managers.length === 0) {
      return { labels: [], datasets: [] };
    }

    const labels = data.managers.slice(0, 5).map(m => 
      (m.fleet_manager || m.name || m.manager || 'Unknown').toUpperCase()
    );

    const values = data.managers.slice(0, 5).map(m => {
      const rawValue = m.total_net || m.total_profit || m.profit || m.net_profit || m.amount || 0;
      return Number(rawValue);
    });

    return {
      labels: labels,
      datasets: [{
        label: 'Net Profit (₦)',
        data: values,
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
        borderWidth: 1,
        borderRadius: 4,
        barThickness: 20, 
      }]
    };
  }, [data]);

  const renderText = (text) => {
    if (!text) return "";
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => 
      part.startsWith('**') ? <strong key={i}>{part.replace(/\*\*/g, '')}</strong> : part
    );
  };

  const handleFilterChange = useCallback(async ({ startDate, endDate, label }) => {
    setLoading(true);
    setCurrentRangeLabel(label);
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
      const groupBy = diffDays > 60 ? 'month' : 'day';

      const [rangeResult, insightsResult] = await Promise.all([
        getRangeData(startDate, endDate, groupBy),
        getInsightsData(startDate, endDate)
      ]);

      setData(rangeResult);
      setInsights(insightsResult.data || []);
    } catch (err) {
      console.error("Dashboard Error:", err);
    } finally {
      setLoading(false);
    }
  }, []); 

  const formatCurrency = (val) => 
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(val || 0);

  // --- LOADING STATE ---
  if (!data && loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 px-4">
      <Loader2 size={40} className="text-blue-500 animate-spin" />
      <div className="text-slate-500 font-medium italic animate-pulse text-center">Analyzing Fleet Data...</div>
    </div>
  );

  // --- EMPTY STATE ---
  if (!data) return (
    <div className="space-y-6 fade-in-up relative px-2 sm:px-0">
      {/* Lowered z-index here to 20 so it slides under nav */}
      <div className="sticky top-0 z-[20] bg-slate-50/90 backdrop-blur-md -mt-4 -mx-4 p-4 border-b border-slate-200 shadow-sm no-print">
        <FilterBar onFilterChange={handleFilterChange} />
      </div>
      <div className="p-8 sm:p-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 transition-all duration-500 hover:bg-slate-100/50 hover:border-slate-300">
        <div className="max-w-xs mx-auto space-y-4">
          <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm animate-bounce">
            <TrendingUp size={32} className="text-blue-400" />
          </div>
          <p className="font-semibold text-slate-700 text-lg">Awaiting Synchronization</p>
          <p className="text-sm text-slate-500">Select a date range from the filter bar above to synchronize real-time fleet analytics.</p>
        </div>
      </div>
    </div>
  );
  
  const { summary, trends, top_performers: topTrucks, topBrands } = data;

  // --- CHART DATA PREPARATION ---
 const trendChartData = {
    labels: trends?.map(t => t.label) || [],
    datasets: [{
      label: 'Net Profit',
      data: trends?.map(t => t.total_profit) || [],
      backgroundColor: '#3b82f6',
      borderRadius: 4,
    }]
  };

  const brandDoughnutData = {
    labels: topBrands?.length > 0 
        ? topBrands.map(b => `${(b.name || 'UNKNOWN').toUpperCase()} (${b.trips || 0} Trips)`) 
        : ['No Data'],
    datasets: [{
        label: 'Net Profit',
        data: topBrands?.length > 0 
            ? topBrands.map(b => b.total_profit || 0) 
            : [1],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'],
        hoverOffset: 15,
        borderWidth: 2,
        borderColor: '#ffffff',
    }]
  };

  return (
    // Lowered absolute relative z-index to 10 for the whole dashboard container
    <div className="space-y-6 pb-10 relative z-10 px-2 sm:px-0 max-w-full overflow-hidden">

     <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up {
          opacity: 0;
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .sticky-filter-container {
          position: sticky;
          top: 0;
          z-index: 20; /* Changed from 100 to 20 to slide under sidebar */
          margin-top: -1.5rem; 
          margin-left: -1rem;
          margin-right: -1rem;
          background-color: #f8fafc; 
          padding: 1rem 1rem 1rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }
        .delay-500 { animation-delay: 500ms; }
      `}</style>

      {/* FIXED WRAPPER */}
      <div className="sticky-filter-container no-print">
        <FilterBar onFilterChange={handleFilterChange} />
      </div>

      <div className="mt-8 space-y-4 sm:space-y-8 px-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end fade-in-up gap-2">
          <div>
            <h2 className="text-xl font-bold text-blue-700 tracking-tight">WatchTower Report Dashboard</h2>
            <p className="text-slate-500 text-sm font-medium flex items-center gap-2 mt-1">
              <CheckCircle size={14} className="text-green-500 shrink-0" /> {currentRangeLabel}
            </p>
          </div>
        </div>
      </div>

      {/* KPI CARDS (Staggered Animation) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 fade-in-up delay-100">
        
        <div className="relative transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg rounded-xl">
          <div className="absolute top-6 right-20 z-10">
            <SectionTooltip text="Total gross profit minus maintenance costs across the selected period." />
          </div>
          <KpiCard 
            title="Total Net Profit" 
            value={formatCompactNumber((summary.total_profit || 0) - (summary.total_maintenance || 0))} 
            icon={Banknote} 
            color="green" 
            // itValue={`IT Gross: ${formatCompactNumber(summary.it_profit)}`}
            // nonItValue={`Non-IT Gross: ${formatCompactNumber(summary.non_it_profit)}`}
          />
        </div>

        <div className="relative transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg rounded-xl">
          <div className="absolute top-6 right-28 z-10">
            <SectionTooltip text="Total number of trips completed, split by IT and NON-IT operations." />
          </div>
          <KpiCard 
            title="Total Trips" 
            value={summary.total_trips} 
            icon={Truck} 
            color="blue" 
            itValue={`${summary.it_trips || 0} IT`}
            nonItValue={`${summary.non_it_trips || 0} NON-IT`}
          />
        </div>

        <div className="relative transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg rounded-xl">
          <div className="absolute top-6 right-28 z-10">
            <SectionTooltip text="Average net profit generated per single trip." />
          </div>
          <KpiCard title="Yield/Trip" value={formatCompactNumber(summary.avg_profit_per_trip)} icon={Activity} color="orange" />
        </div>

        <div className="relative transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg rounded-xl">
          <div className="absolute top-6 right-28 z-10">
            <SectionTooltip text="Percentage of the total fleet that completed at least one trip." />
          </div>
          <KpiCard title="Utilization" value={`${summary.utilization_rate}%`} icon={TrendingUp} color="purple" />
        </div>
      </div>

      {/* ANALYTICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 relative">

        {/* Profit Trend */}
        <div className="relative fade-in-up delay-200 transition-all duration-300 hover:shadow-md rounded-2xl w-full">
          <div className="absolute top-0 right-28 z-10">
            <TooltipHeader tooltipText="Daily or monthly breakdown of net profit generation." />
            </div>
            <ChartCard 
              title={`NET PROFIT TREND`} 
              type="bar" 
              data={trendChartData} 
              options={{
                maintainAspectRatio: false,
                scales: {
                  y: { ticks: { callback: (value) => formatCompactNumber(value) } },
                  x: { ticks: { maxRotation: 45, minRotation: 45 } }
                },
                plugins: {
                  tooltip: { callbacks: { label: (ctx) => ` Profit: ${formatCompactNumber(ctx.raw)}` } }
                }
              }}
            />
          </div>

        {/* Brand Performance */}
        <div className="relative fade-in-up delay-300 transition-all duration-300 hover:shadow-md rounded-2xl w-full">
             <div className="absolute top-0 right-40 z-10">
            <TooltipHeader tooltipText="Contribution to the total net profit categorized by truck brand." />
            </div>
            <ChartCard 
              title="PROFIT SHARE BY BRAND" 
              type="doughnut" 
              data={brandDoughnutData} 
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' }, 
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const value = Number(context.raw) || 0;
                        const dataset = context.dataset.data || [];
                        const total = dataset.reduce((a, b) => a + (Number(b) || 0), 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                        return ` Profit: ${formatCompactNumber(value)} (${percentage}%)`;
                      }
                    }
                  }
                }
              }}
            />
          </div>

        {/* Top Performers Table */}
       <div className="relative bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px] sm:h-[450px] fade-in-up delay-400 w-full">
            <h3 className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-widest mb-4 sm:mb-6 flex flex-wrap items-center gap-2">
              <span>Top Performers (Truck & Driver)</span>
              <SectionTooltip text="The top trucks generating the highest net profit." />
            </h3>
            <div className="overflow-y-auto overflow-x-auto flex-1 scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0">
              <table className="w-full text-left min-w-[280px]">
                <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                    <th className="pb-3 px-1 sm:px-2">Driver</th>
                    <th className="pb-3 text-center">Trips</th>
                    <th className="pb-3 text-right px-1">Net Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {topTrucks?.map((truck, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-all duration-200 group">
                      <td className="py-3 px-1 sm:px-2 max-w-[120px]">
                        <p className="text-xs sm:text-sm font-black text-slate-800 truncate">{truck.truck_number || truck.id}</p>
                        <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold truncate">{truck.driver_name || 'Unassigned'}</p>
                      </td>
                      <td className="py-3 text-center text-xs sm:text-sm font-bold text-slate-600">{truck.trips}</td>
                      <td className="py-3 text-right px-1">
                        <span className="text-[10px] sm:text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border border-emerald-100 whitespace-nowrap">
                          {formatCompactNumber(truck.profit)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        {/* Manager Leaderboard */}
        <div className="relative fade-in-up delay-500 transition-all duration-300 hover:shadow-md rounded-2xl w-full">
            <div className="absolute top-0 right-40 z-10">
          <TooltipHeader tooltipText="Fleet managers ranked by the total net profit of their assigned trucks." />
        </div>
          <ChartCard 
            key={`leaderboard-${data?.managers?.length}`} 
            title="FLEET MANAGER LEADERBOARD" 
            type="bar" 
            data={managerData} 
            options={{ 
              indexAxis: 'y', 
              maintainAspectRatio: false,
              plugins: { 
                legend: { display: false },
                tooltip: { 
                  callbacks: { label: (ctx) => ` Profit: ${formatCompactNumber(ctx.raw)}` } 
                }
              },
              scales: {
                x: { 
                  beginAtZero: true, 
                  grid: { display: true, color: '#f1f5f9' },
                  ticks: { callback: (v) => formatCompactNumber(v), font: { size: 9 }, maxRotation: 45, minRotation: 45 } 
                },
                y: { grid: { display: false }, ticks: { font: { size: 9, weight: 'bold' } } }
              }
            }} 
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;