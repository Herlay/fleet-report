import React, { useState, useMemo } from 'react';

import { 
  Banknote, Truck, Activity, TrendingUp, Download,
  Lightbulb, TrendingDown, AlertTriangle, CheckCircle, User, Loader2 
} from 'lucide-react';
import KpiCard from '../components/KpiCard';
import ChartCard from '../components/ChartCard';
import FilterBar from '../components/FilterBar'; 
import { getRangeData, getInsightsData } from '../services/api';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentRangeLabel, setCurrentRangeLabel] = useState('');

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

const handleFilterChange = async ({ startDate, endDate, label }) => {
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
  };

   const formatCurrency = (val) => 
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(val || 0);

 
  if (!data && loading) return <div className="p-10 text-center text-slate-500 font-medium italic animate-pulse">Analyzing Fleet Intelligence...</div>;

  if (!data) return (
    <div className="space-y-6">
      <FilterBar onFilterChange={handleFilterChange} />
      <div className="p-20 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
        <div className="max-w-xs mx-auto space-y-3">
          <TrendingUp size={40} className="mx-auto text-slate-300" />
          <p className="font-semibold text-slate-600">Command Center Offline</p>
          <p className="text-sm">Select a date range to synchronize real-time fleet analytics.</p>
        </div>
      </div>
    </div>
  );
 
const { summary, trends, managers, top_performers: topTrucks, topBrands } = data;

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

const brandChartOptions = {
    plugins: {
        tooltip: {
            callbacks: {
                label: (context) => {
                    const label = context.label || '';
                    const value = context.raw || 0;
                    return ` ${label}: ₦${parseInt(value).toLocaleString()}`;
                }
            }
        },
        legend: {
            position: 'bottom',
            labels: {
                padding: 20,
                font: { size: 11, weight: '600' }
            }
        }
    },
    maintainAspectRatio: false,
    cutout: '65%' 
};

const doughnutOptions = {
    plugins: {
        tooltip: {
            callbacks: {
                label: (context) => {
                    const value = context.raw;
                    return ` Total Profit: ₦${parseInt(value).toLocaleString()}`;
                }
            }
        },
        legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { size: 11, weight: '600' } }
        }
    },
    cutout: '70%' 
};
console.log("Brand Data Check:", topBrands);

  return (
    <div className="space-y-6 pb-10">
      <FilterBar onFilterChange={handleFilterChange} />

    
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Fleet Report Dashboard</h2>
          <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
            <CheckCircle size={14} className="text-green-500" /> {currentRangeLabel}
          </p>
        </div>
     
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KpiCard 
          title="Total Net Profit" 
          value={formatCurrency(summary.total_profit)} 
          icon={Banknote} 
          color="green" 
          itValue={formatCurrency(summary.it_profit)}
          nonItValue={formatCurrency(summary.non_it_profit)}
        />
        <KpiCard 
          title="Total Trips" 
          value={summary.total_trips} 
          icon={Truck} 
          color="blue" 
          itValue={`${summary.it_trips || 0} IT`}
          nonItValue={`${summary.non_it_trips || 0} NON-IT`}
        />
        <KpiCard title="Yield/Trip" value={formatCurrency(summary.avg_profit_per_trip)} icon={Activity} color="orange" />
        <KpiCard title="Utilization" value={`${summary.utilization_rate}%`} icon={TrendingUp} color="purple" />
      </div>

      {/* INSIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.length > 0 ? (
          insights.map((insight, index) => (
            <div key={index} className={`p-4 rounded-xl border flex items-start space-x-3 bg-white shadow-sm transition-all hover:shadow-md ${
              insight.type === 'positive' ? 'border-green-100 bg-green-50/20' :
              insight.type === 'negative' ? 'border-red-100 bg-red-50/20' : 'border-blue-100 bg-blue-50/20'
            }`}>
              <div className={`mt-1 shrink-0 ${insight.type === 'positive' ? 'text-green-600' : insight.type === 'negative' ? 'text-red-600' : 'text-blue-600'}`}>
                {insight.type === 'positive' && <TrendingUp size={18} />}
                {insight.type === 'negative' && <TrendingDown size={18} />}
                {insight.type === 'warning' && <AlertTriangle size={18} />}
                {insight.type === 'neutral' && <Lightbulb size={18} />}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-slate-800 mb-1">{insight.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{renderText(insight.text)}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 p-6 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 font-medium italic">
            <CheckCircle size={20} className="mr-3 text-slate-400" /> All operations are performing within optimized parameters.
          </div>
        )}
      </div>

      {/* ANALYTICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Profit Trend */}
        <ChartCard title={`NET PROFIT TREND`} type="bar" data={trendChartData} />
        
        {/* Brand Performance */}
    <ChartCard 
  title="PROFIT SHARE BY BRAND" 
  type="doughnut" 
  data={brandDoughnutData} 
  options={{
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return ` Profit: ₦${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    }
  }}
/>

        {/* Top Performers Table */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[450px] overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Top Performers (Truck & Driver)</h3>
          </div>
          <div className="overflow-x-auto flex-1 scrollbar-hide">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                  <th className="pb-4 px-2">Driver</th>
                  <th className="pb-4 text-center">Trips</th>
                  <th className="pb-4 text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
  {topTrucks?.map((truck, i) => {
  
    const truckId = truck.truck_number || truck.id || truck.truck_id || 'Unknown';
    const driver = truck.driver_name || truck.driver || 'Unassigned';
    const trips = truck.total_trips || truck.trip_count || truck.trips || 0;
    const profit = truck.total_profit || truck.net_profits_made || truck.profit || 0;

    return (
      <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
        <td className="py-4 px-2">
          <p className="text-sm font-black text-slate-800 group-hover:text-blue-600">
            {truckId}
          </p>
          <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-1">
            <User size={10} className="text-slate-300" /> {driver}
          </p>
        </td>
        <td className="py-4 text-center text-sm font-bold text-slate-600">
          {trips}
        </td>
        <td className="py-4 text-right">
          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
            {formatCurrency(profit)}
          </span>
        </td>
      </tr>
    );
  })}
</tbody>
            </table>
          </div>
        </div>

      <ChartCard 
  key={`leaderboard-${data?.managers?.length}`} 
  title="FLEET MANAGER LEADERBOARD (BY NET PROFIT)" 
  type="bar" 
  data={managerData} 
  options={{ 
    indexAxis: 'y', 
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
    },
    scales: {
      x: { 
        beginAtZero: true, 
        grid: { display: true, color: '#f1f5f9' },
        ticks: { 
          callback: (v) => '₦' + v.toLocaleString(),
          font: { size: 10 } 
        } 
      },
      y: { 
        grid: { display: false },
        ticks: { font: { size: 10, weight: 'bold' } } 
      }
    }
  }} 
/>
      </div>
    </div>
  );
};

export default Dashboard;