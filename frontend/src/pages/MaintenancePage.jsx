import React, { useState, useMemo, useCallback } from 'react';
import { 
  Wrench, AlertTriangle, TrendingUp, Activity, 
  Search, FileText, CheckCircle, Loader2, Info, Filter, Truck
} from 'lucide-react';
import KpiCard from '../components/KpiCard';
import ChartCard from '../components/ChartCard';
import FilterBar from '../components/FilterBar'; 
import { getMaintenanceReportData } from '../services/api';

// --- CUSTOM TOOLTIP COMPONENT ---
const SectionTooltip = ({ text }) => (
  <div className="relative flex items-center group cursor-help inline-flex ml-2">
    <Info size={16} className="text-slate-400 group-hover:text-red-500 transition-colors shrink-0" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 sm:w-56 p-2.5 bg-slate-800 text-white text-[11px] leading-relaxed rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[30] text-center font-normal shadow-xl normal-case tracking-normal">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
    </div>
  </div>
);

// --- TOOLTIP CHART HEADER (MOBILE RESPONSIVE FIX) ---
const TooltipHeader = ({ tooltipText }) => (
  <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 mb-4 absolute top-5 left-6 right-6 z-10 pointer-events-none">
     <div className="w-full flex justify-end sm:justify-between pointer-events-auto">
        <span className="hidden sm:inline"></span>
        <SectionTooltip text={tooltipText} />
     </div>
  </div>
);

// --- AUTO-CATEGORIZATION LOGIC ---
const categorizeItem = (desc) => {
    if (!desc) return 'General/Other';
    const lower = desc.toLowerCase();
    if (/(tyre|tire|patch|vulcanizer|guaging|rim)/.test(lower)) return 'Tyres & Wheels';
    if (/(oil|filter|service|grease|coolant|washing|pms|petrol|diesel)/.test(lower)) return 'PM & Fluids';
    if (/(brake|pad|lining|falcon|chamber|drum)/.test(lower)) return 'Brakes';
    if (/(battery|wire|bulb|relay|electrical|light|switch|starter|alternator|sensor|rewire)/.test(lower)) return 'Electrical';
    if (/(engine|injector|nozzle|pump|turbo|belt|cylinder|piston|radiator|valves)/.test(lower)) return 'Engine';
    if (/(gear|clutch|propeller|transmission|shooter)/.test(lower)) return 'Transmission';
    if (/(spring|shock|absorber|axle|bushing|suspension|u-bolt|u clip|hanger)/.test(lower)) return 'Suspension';
    if (/(ticket|settlement|police|lastma|lea|toll|parking|demurrage|call up|security|area boys|fine)/.test(lower)) return 'Fines & Settlement';
    if (/(weld|gas|panel|bumper|body|glass|windscreen)/.test(lower)) return 'Body & Welding';
    return 'General/Other';
};

const MaintenancePage = () => {   
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentRangeLabel, setCurrentRangeLabel] = useState('');
  
  // Local Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTruck, setFilterTruck] = useState('ALL');
  const [filterBrand, setFilterBrand] = useState('ALL');
  const [filterFleet, setFilterFleet] = useState('ALL');

  // --- MANUAL COMPACT FORMATTING (Fix for K & M) ---
  const formatCompactNumber = (number) => {
    if (number === null || number === undefined || isNaN(number)) return "₦0";
    
    const num = Number(number);
    if (num >= 1e9) return `₦${(num / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
    if (num >= 1e6) return `₦${(num / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
    if (num >= 1e3) return `₦${(num / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
    return `₦${num.toLocaleString('en-NG')}`;
  };

  const formatCurrency = (val) => 
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(val || 0);

  // --- API CALL ---
  const handleFilterChange = useCallback(async ({ startDate, endDate, label }) => {
    setLoading(true);
    setCurrentRangeLabel(label);
    try {
      const response = await getMaintenanceReportData(startDate, endDate);
      if (response.success) setData(response.data);
    } catch (err) {
      console.error("Dashboard Error:", err);
    } finally {
      setLoading(false);
    }
  }, []); 

  // --- MEMOIZED DATA PROCESSING ---
  const { processedLedger, uniqueTrucks, uniqueBrands, uniqueFleets, categoryData, dynamicKpis, expensiveRepairs } = useMemo(() => {
      if (!data?.ledger) return { processedLedger: [], uniqueTrucks: [], uniqueBrands: [], uniqueFleets: [], categoryData: {}, dynamicKpis: {}, expensiveRepairs: [] };

      // 1. Apply Auto-Categorization
      const ledgerWithCategories = data.ledger.map(item => ({
          ...item,
          category: categorizeItem(item.item)
      }));

      // 2. Extract Unique values for Dropdowns
      const trucks = [...new Set(ledgerWithCategories.map(l => l.truck))].filter(Boolean).sort();
      const brands = [...new Set(ledgerWithCategories.map(l => l.brand))].filter(b => b && b !== 'UNKNOWN').sort();
      const fleets = [...new Set(ledgerWithCategories.map(l => l.fleet))].filter(Boolean).sort();

      // 3. Category Aggregation
      const catTotals = {};
      ledgerWithCategories.forEach(item => {
          catTotals[item.category] = (catTotals[item.category] || 0) + item.amount;
      });

      // 4. Dynamic KPIs
      const justTrucks = ledgerWithCategories.filter(l => l.truck !== 'NON-TRUCK' && l.truck !== 'Non-truck');
      const totalTrucksMaintained = new Set(justTrucks.map(l => l.truck)).size;
      const totalSpend = data.kpis.total_spend || 0;
      const avgCostPerTruck = totalTrucksMaintained > 0 ? (totalSpend / totalTrucksMaintained) : 0;

      // 5. Top 10 Individual Most Expensive Repairs
      const top10Repairs = [...ledgerWithCategories]
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10);

      return {
          processedLedger: ledgerWithCategories,
          uniqueTrucks: ['ALL', ...trucks],
          uniqueBrands: ['ALL', ...brands],
          uniqueFleets: ['ALL', ...fleets],
          categoryData: catTotals,
          dynamicKpis: { totalTrucksMaintained, avgCostPerTruck },
          expensiveRepairs: top10Repairs
      };
  }, [data]);

  // --- APPLY LOCAL FILTERS ---
  const filteredLedger = useMemo(() => {
      return processedLedger.filter(item => {
          const matchesSearch = item.item.toLowerCase().includes(searchTerm.toLowerCase()) || item.truck.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesTruck = filterTruck === 'ALL' || item.truck === filterTruck;
          const matchesBrand = filterBrand === 'ALL' || item.brand === filterBrand;
          const matchesFleet = filterFleet === 'ALL' || item.fleet === filterFleet;
          return matchesSearch && matchesTruck && matchesBrand && matchesFleet;
      });
  }, [processedLedger, searchTerm, filterTruck, filterBrand, filterFleet]);

// --- ARCHITECT FIX: DYNAMIC CATEGORY BAR CHART DATA (MULTI-COLOR) ---
  const categoryHorizontalBarData = useMemo(() => {
    const categoryTotals = filteredLedger?.reduce((acc, curr) => {
      const cat = curr.category || 'Uncategorized'; 
      acc[cat] = (acc[cat] || 0) + Number(curr.amount || 0);
      return acc;
    }, {}) || {};

    // Sort categories from highest spend to lowest
    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

    // A professional, modern SaaS color palette (Tailwind-inspired)
    // The highest spend gets the first color (Red), second gets Orange, etc.
    const barColors = [
      '#ef4444', // Red-500 (Most expensive)
      '#f97316', // Orange-500
      '#f59e0b', // Amber-500
      '#eab308', // Yellow-500
      '#84cc16', // Lime-500
      '#10b981', // Emerald-500
      '#06b6d4', // Cyan-500
      '#3b82f6', // Blue-500
      '#6366f1', // Indigo-500
      '#8b5cf6', // Violet-500
      '#d946ef', // Fuchsia-500
      '#64748b'  // Slate-500 (Fallback for extra categories)
    ];

    return {
      labels: sortedCategories.map(item => item[0]), 
      datasets: [
        {
          label: 'Maintenance Spend',
          data: sortedCategories.map(item => item[1]), 
          backgroundColor: barColors, // <--- WE PASS THE ARRAY OF COLORS HERE
          borderRadius: 4,
          borderWidth: 1,
          borderColor: 'transparent',
          hoverBorderColor: '#000000', // Adds a nice black border when you hover over a bar
        }
      ]
    };
  }, [filteredLedger]);

  // --- LOADING / EMPTY STATES ---
  if (!data && loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 px-4">
      <Loader2 size={40} className="text-red-500 animate-spin" />
      <div className="text-slate-500 font-medium italic animate-pulse text-center">Analyzing Maintenance Data...</div>
    </div>
  );

  if (!data) return (
    <div className="space-y-6 fade-in-up relative px-2 sm:px-0">
      <div className="sticky top-0 z-[20] bg-slate-50/90 backdrop-blur-md -mt-4 -mx-4 p-4 border-b border-slate-200 shadow-sm no-print">
        <FilterBar onFilterChange={handleFilterChange} />
      </div>
      
      <div className="p-8 sm:p-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 transition-all duration-500 hover:bg-slate-100/50 hover:border-slate-300">
        <div className="max-w-xs mx-auto space-y-4">
          <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm animate-bounce">
            <Wrench size={32} className="text-red-400" />
          </div>
          <p className="font-semibold text-slate-700 text-lg">Awaiting Maintenance Data</p>
          <p className="text-sm text-slate-500">Select a date range from the filter bar above to synchronize the repair logs.</p>
        </div>
      </div>
    </div>
  );

  // --- CHART CONFIGURATIONS ---
  const trendLineData = {
    labels: data.trends?.map(t => t.date) || [],
    datasets: [{
      label: 'Daily Spend',
      data: data.trends?.map(t => t.spend) || [],
      borderColor: '#e6020262', 
      backgroundColor: 'rgb(209, 17, 17)', 
      fill: true, 
      tension: 0.3, 
      borderWidth: 2, 
      pointRadius: 4
    }]
  };

  const truckSpendBarData = {
      labels: data.topOffenders?.map(t => t.truck_number) || [],
      datasets: [{
          label: 'Total Spend', data: data.topOffenders?.map(t => t.spend) || [],
          backgroundColor: '#f97316', borderRadius: 4,
      }]
  };

  const brandPieData = {
    labels: data.brandDistribution?.length > 0 ? data.brandDistribution.map(b => b.brand) : ['No Data'],
    datasets: [{
        data: data.brandDistribution?.length > 0 ? data.brandDistribution.map(b => b.spend) : [1],
        backgroundColor: ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#10b981', '#64748b'],
        hoverOffset: 10, borderWidth: 2, borderColor: '#ffffff',
    }]
  };

  // Extract Top 10 Trucks by Visit Frequency for the new Table
  const topFreqTrucks = [...(data.topOffenders || [])].sort((a,b) => b.visits - a.visits).slice(0, 10);

  return (
    <div className="space-y-6 pb-10 relative z-10 px-2 sm:px-0 max-w-full overflow-hidden">
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in-up { opacity: 0; animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .delay-100 { animation-delay: 100ms; } .delay-200 { animation-delay: 200ms; } .delay-300 { animation-delay: 300ms; }
        
        .sticky-filter-container {
          position: sticky;
          top: 0;
          z-index: 20; 
          margin-top: -1.5rem; 
          margin-left: -1rem;
          margin-right: -1rem;
          background-color: #f8fafc; 
          padding: 1rem 1rem 1rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }
      `}</style>

      {/* 1. GLOBAL DATE FILTER */}
      <div className="sticky-filter-container no-print">
        <FilterBar onFilterChange={handleFilterChange} />
      </div>

      <div className="mt-8 space-y-4 sm:space-y-8 px-1">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end fade-in-up gap-2">
          <div>
         <h2 className="text-xl font-bold text-red-700 tracking-tight">WatchTower Maintenance Dashboard</h2>   <p className="text-slate-500 text-sm font-medium flex items-center gap-2 mt-1">
              <CheckCircle size={14} className="text-red-500 shrink-0" /> {currentRangeLabel}
            </p>
          </div>
        </div>
      </div>

      {/* 2. KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 fade-in-up delay-100">
        <div className="relative transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg rounded-xl h-full">
          <div className="absolute top-6 right-20 z-10"><SectionTooltip text="Total money spent on maintenance." /></div>
          <KpiCard title="Total Maint. Cost" value={formatCompactNumber(data.kpis.total_spend)} icon={Activity} color="red" />
        </div>
        <div className="relative transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg rounded-xl h-full">
          <div className="absolute top-6 right-20 z-10"><SectionTooltip text="Number of unique repair items recorded." /></div>
          <KpiCard title="Total Repairs" value={data.kpis.total_incidents} icon={Wrench} color="orange" />
        </div>
        <div className="relative transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg rounded-xl h-full">
          <div className="absolute top-6 right-20 z-10"><SectionTooltip text="Number of unique trucks that visited the workshop." /></div>
          <KpiCard title="Trucks Maintained" value={dynamicKpis.totalTrucksMaintained} icon={Truck} color="blue" />
        </div>
        <div className="relative transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg rounded-xl h-full">
          <div className="absolute top-6 right-30 z-10"><SectionTooltip text="Average spend per truck that received maintenance." /></div>
          <KpiCard title="Avg Cost Per Truck" value={formatCompactNumber(dynamicKpis.avgCostPerTruck)} icon={TrendingUp} color="purple" />
        </div>
      </div>

      {/* 3. CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 relative">
        
        {/* Trend Chart (Bar) */}
        <div className="lg:col-span-2 relative fade-in-up delay-200 transition-all duration-300 hover:shadow-md rounded-2xl w-full">
          <div className="absolute top-2 right-40 z-10">
             <TooltipHeader tooltipText="Daily spending trend across the selected period." />
             </div>
          <ChartCard 
            title="DAILY MAINTENANCE TREND" 
            type="bar" 
            data={trendLineData} 
            options={{ 
              maintainAspectRatio: false,
              scales: { 
                y: { ticks: { callback: (value) => formatCompactNumber(value) } },
                x: { ticks: { maxRotation: 45, minRotation: 45 } }
              }, 
              plugins: { tooltip: { callbacks: { label: (ctx) => ` Spend: ${formatCompactNumber(ctx.raw)}` } } } 
            }} 
          />
        </div>

        {/* Brand Pie Chart */}
        <div className="lg:col-span-1 relative fade-in-up delay-200 transition-all duration-300 hover:shadow-md rounded-2xl w-full">
          <div className="absolute top-2 right-20 z-10">
          <TooltipHeader tooltipText="Maintenance cost distribution by truck brand." />
          </div>
          <ChartCard 
            title="COST BY FLEET MANAGERS" 
            type="doughnut" 
            data={brandPieData} 
            options={{ 
              maintainAspectRatio: false,
              plugins: { 
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: (ctx) => ` Spend: ${formatCompactNumber(ctx.raw)}` } } 
              } 
            }} 
          />
        </div>

        {/* Top Offender Cost (Bar) */}
        <div className="lg:col-span-2 relative fade-in-up delay-300 transition-all duration-300 hover:shadow-md rounded-2xl w-full">
          <div className="absolute top-2 right-40 z-10">
          <TooltipHeader tooltipText="The trucks that cost the most money to maintain." />
          </div>
          <ChartCard 
            title="MAINTENANCE COST BY TRUCK (TOP 10)" 
            type="bar" 
            data={truckSpendBarData} 
            options={{ 
              maintainAspectRatio: false,
              scales: { 
                y: { ticks: { callback: (value) => formatCompactNumber(value) } },
                x: { ticks: { maxRotation: 45, minRotation: 45 } }
              }, 
              plugins: { tooltip: { callbacks: { label: (ctx) => ` Spend: ${formatCompactNumber(ctx.raw)}` } } } 
            }} 
          />
        </div>

        {/* Top Frequency Table */}
        <div className="lg:col-span-1 relative bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm fade-in-up delay-300 flex flex-col h-[400px] sm:h-full w-full">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-4 flex items-center flex-wrap gap-2">
             <span className="flex items-center"> Trucks with Most Repairs</span>
              <div className="absolute top-5 right-20 z-10">
             <SectionTooltip text="The trucks with the highest frequency of workshop visits." />
             </div>
          </h3>
          <div className="overflow-y-auto overflow-x-auto flex-1 scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0">
             <table className="w-full text-left whitespace-nowrap min-w-[250px]">
                 <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                     <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                         <th className="pb-2 px-1 sm:px-2">Truck No.</th>
                         <th className="pb-2 text-center">Visits</th>
                         <th className="pb-2 text-right px-1 sm:px-2">Cost</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                     {topFreqTrucks.map((t, i) => (
                         <tr key={i} className="hover:bg-slate-50 transition-colors">
                             <td className="py-2 px-1 sm:px-2 text-xs font-bold text-slate-700">{t.truck_number}</td>
                             <td className="py-2 text-xs font-bold text-slate-500 text-center">{t.visits}</td>
                             <td className="py-2 px-1 sm:px-2 text-xs font-bold text-red-500 text-right">{formatCompactNumber(t.spend)}</td>
                         </tr>
                     ))}
                 </tbody>
             </table>
          </div>
        </div>

      {/* Category Analysis (Horizontal Bar) */}
        <div className="lg:col-span-3 relative fade-in-up delay-300 transition-all duration-300 hover:shadow-md rounded-2xl w-full">
          <div className="absolute top-2 right-40 z-10">
            <TooltipHeader tooltipText="Automatically categorizes repair items to show where the budget is going." />
          </div> 
          <ChartCard 
            title="MAINTENANCE CATEGORY ANALYSIS" 
            type="bar" 
            data={categoryHorizontalBarData} 
            options={{ 
              maintainAspectRatio: false, 
              indexAxis: 'y', 
              plugins: { 
                legend: { display: false }, 
                tooltip: { callbacks: { label: (ctx) => ` Spend: ${formatCompactNumber(ctx.raw)}` } } 
              },
              scales: {
                x: { 
                  beginAtZero: true,
                  grid: { color: '#f1f5f9' },
                  ticks: { callback: (value) => formatCompactNumber(value) } 
                },
                y: {
                  grid: { display: false }, 
                  ticks: { font: { weight: '600' }, color: '#475569' } 
                }
              }
            }} 
          />
        </div>
      </div>

      {/* 4. TABLES SECTION */}
      <div className="grid grid-cols-1 gap-6 sm:gap-8 fade-in-up delay-300">
          
          {/* Top 10 Individual Repairs */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm relative">
              <h3 className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-widest mb-4 sm:mb-6 flex items-center">
              <AlertTriangle size={16} className="mr-2 text-orange-500" /> Top 10 Most Expensive Repairs
              </h3>
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-left whitespace-nowrap min-w-[600px]">
                  <thead className="bg-slate-50 border-y border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Truck</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Amount</th>
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                  {expensiveRepairs.map((item, i) => (
                      <tr key={i} className="hover:bg-red-50/30 transition-colors text-sm">
                          <td className="p-3 text-slate-500 text-xs sm:text-sm">{item.date}</td>
                          <td className="p-3 font-bold text-slate-700 text-xs sm:text-sm">{item.truck}</td>
                          <td className="p-3"><span className="text-[9px] sm:text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{item.category}</span></td>
                          <td className="p-3 text-slate-600 max-w-[200px] sm:max-w-[300px] truncate text-xs sm:text-sm" title={item.item}>{item.item}</td>
                          <td className="p-3 text-right font-bold text-red-600 text-xs sm:text-sm">{formatCompactNumber(item.amount)}</td>
                      </tr>
                  ))}
                  </tbody>
              </table>
              </div>
          </div>

          {/* Detailed Maintenance Log with Local Filters */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[500px] sm:h-[600px] relative">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 sm:mb-6">
                 {/* Title and Record Count Wrapper */}
                <div className="flex flex-col items-start gap-1.5">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center whitespace-nowrap">
                        <FileText size={16} className="mr-2 text-slate-400" /> All Maintenance Cost
                    </h3>
                    <span className="bg-slate-100 border border-slate-200 text-red-600 py-0.5 px-2.5 rounded-full text-[10px] normal-case tracking-normal font-medium">
                        {filteredLedger?.length || 0} {filteredLedger?.length === 1 ? 'Record' : 'Records'}
                    </span>
                </div>
                  
                  {/* Local Filters Row */}
                  <div className="flex flex-wrap w-full xl:w-auto items-center gap-2 sm:gap-3">
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 sm:px-3 py-1.5 flex-1 sm:flex-none">
                          <Filter size={14} className="text-slate-400 mr-2 shrink-0" />
                          <select value={filterTruck} onChange={e => setFilterTruck(e.target.value)} className="bg-transparent text-[10px] sm:text-xs font-medium focus:outline-none text-slate-700 w-full sm:w-24">
                              {uniqueTrucks.map(t => <option key={t} value={t}>{t === 'ALL' ? 'All Trucks' : t}</option>)}
                          </select>
                      </div>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 sm:px-3 py-1.5 flex-1 sm:flex-none">
                          <Filter size={14} className="text-slate-400 mr-2 shrink-0" />
                          <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className="bg-transparent text-[10px] sm:text-xs font-medium focus:outline-none text-slate-700 w-full sm:w-24">
                              {uniqueBrands.map(b => <option key={b} value={b}>{b === 'ALL' ? 'All Brands' : b}</option>)}
                          </select>
                      </div>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 sm:px-3 py-1.5 flex-1 sm:flex-none">
                          <Filter size={14} className="text-slate-400 mr-2 shrink-0" />
                          <select value={filterFleet} onChange={e => setFilterFleet(e.target.value)} className="bg-transparent text-[10px] sm:text-xs font-medium focus:outline-none text-slate-700 w-full sm:w-24 truncate">
                              {uniqueFleets.map(f => <option key={f} value={f}>{f === 'ALL' ? 'All Fleets' : f}</option>)}
                          </select>
                      </div>
                      <div className="relative w-full sm:w-64 mt-2 sm:mt-0">
                          <input type="text" placeholder="Search item or truck..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                          <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
                      </div>
                  </div>
              </div>

              <div className="overflow-x-auto flex-1 border border-slate-100 rounded-xl relative -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-left whitespace-nowrap min-w-[700px]">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10 shadow-sm">
                  <tr className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="p-3">Date</th>
                      <th className="p-3">Truck No</th>
                      <th className="p-3">Brand / Fleet</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 w-1/3">Item / Description</th>
                      <th className="p-3 text-right">Amount</th>
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                  {filteredLedger?.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors text-xs">
                      <td className="p-3 text-slate-500">{item.date}</td>
                      <td className="p-3 font-bold text-slate-700">{item.truck}</td>
                      <td className="p-3 text-slate-500"><span className="block font-bold">{item.brand}</span><span className="text-[9px]">{item.fleet}</span></td>
                      <td className="p-3 text-slate-500">{item.category}</td>
                      <td className="p-3 text-slate-600 truncate max-w-[150px] sm:max-w-[200px]" title={item.item}>{item.item}</td>
                      <td className="p-3 text-right font-bold text-red-600">{formatCurrency(item.amount)}</td>
                      </tr>
                  ))}
                  {filteredLedger?.length === 0 && (
                      <tr><td colSpan="6" className="text-center py-10 text-slate-400">No records match your filters.</td></tr>
                  )}
                  </tbody>
              </table>
              </div>
          </div>

      </div>
    </div>
  );
};

export default MaintenancePage;