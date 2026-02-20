import React, { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Printer, Sparkles, ArrowLeft, Download, FileText, Truck, 
  Target, Activity, Users, Award, Calendar, TrendingUp, TrendingDown, Zap, ShieldCheck, BarChart3, BarChartBig,
  AlertCircle 
} from 'lucide-react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, 
  Title, Tooltip, Legend, PointElement, LineElement, ArcElement,  LineController
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';
import FilterBar from '../components/FilterBar'; 
import { getWeeklyReportAI } from '../services/api'; 

ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, Tooltip, 
  Legend, PointElement, LineElement, ArcElement, LineController
);

const ReportPage = () => {
  const reportRef = useRef();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [meta, setMeta] = useState({ label: '', absoluteWeek: null });

  const handleFilterChange = useCallback(async (f) => {
    setLoading(true);
    setMeta({ label: f.label, absoluteWeek: f.absoluteWeek });
    try {
      const result = await getWeeklyReportAI(f.startDate, f.endDate, f.absoluteWeek);
      if (result.success) setReportData(result.data);
    } catch (err) { 
      console.error("Fetch Error:", err); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  const fmt = (v) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(v || 0);
  
  const calcChange = (curr, prev) => {
    if (!prev || prev === 0) return "0%";
    const change = ((curr - prev) / Math.abs(prev)) * 100;
    return `${change >= 0 ? '+' : ''}${Math.round(change)}%`;
  };

  const downloadPDF = () => {
    const element = reportRef.current;
    const opt = {
      margin: [10, 10],
      filename: `Fleet_Intelligence_Wk${meta.absoluteWeek}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const downloadWord = () => {
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + reportRef.current.innerHTML + footer;
    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    saveAs(blob, `Fleet_Report_Wk${meta.absoluteWeek}.doc`);
  };

  
  const renderContent = () => {
    if (loading) return (
      <div className="min-h-[400px] flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100">
        <Sparkles className="animate-pulse text-blue-600 mb-4" size={48} />
        <p className="text-lg font-bold text-slate-700 italic">Generating Report for Week {meta.absoluteWeek}...</p>
      </div>
    );
    
    if (!reportData) return (
      <div className="p-20 text-center text-slate-400 border-2 border-dashed rounded-xl bg-white/50">
        <Calendar className="mx-auto mb-4 opacity-20" size={64} />
        <p className="text-xl font-medium">Select a period in the filter bar to generate report.</p>
      </div>
    );

    const { metrics, text: aiText } = reportData;

  const trendData = {
  labels: metrics?.trends?.map(t => t.week),
  datasets: [
    {
      label: 'Non-IT Jobs',
      data: metrics?.trends?.map(t => t.non_it_trips || t.trips),
      backgroundColor: '#1e3a8a', 
      borderRadius: 4,
      yAxisID: 'y',
    },
  
    {
      label: 'Net Profit (₦)',
      type: 'line', 
      data: metrics?.trends?.map(t => t.profit),
      borderColor: '#16a34a',
      backgroundColor: '#16a34a',
      borderWidth: 3,
      pointRadius: 5,
      fill: false,
      yAxisID: 'y1', 
    }
  ]
};

    const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        label: function(context) {
          let label = context.dataset.label || '';
          if (label.includes('Profit')) {
            return `${label}: ₦${(context.raw / 1000000).toFixed(1)}M`;
          }
          return `${label}: ${context.raw} Trips`;
        }
      }
    }
  },
  scales: {
    x: { stacked: true, grid: { display: false } },
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      stacked: true,
      title: { display: true, text: 'Trip Volume', font: { size: 10, weight: 'bold' } }
    },
    y1: {
      type: 'linear',
      display: true,
      position: 'right',
      grid: { drawOnChartArea: false }, 
      title: { display: true, text: 'Net Profit (₦)', font: { size: 10, weight: 'bold' } },
      ticks: {
        callback: (value) => `₦${value / 1000000}M` 
      }
    }
  }
};
    return (
      <div ref={reportRef} className="mx-auto bg-white w-[210mm] p-12 text-slate-800 shadow-2xl printable-area overflow-hidden">
        
        <div style={{ borderBottom: '5px solid #1e3a8a', paddingBottom: '15px', marginBottom: '25px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#1e3a8a', margin: 0 }}>
            Weekly Performance Report {meta.label} (Week {meta.absoluteWeek})
          </h1>
        </div>

        {/*  EXECUTIVE SUMMARY */}
        <section style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px', marginBottom: '10px' }}>Executive Summary</h3>
          <p style={{ fontSize: '11px', lineHeight: '1.7', textAlign: 'justify', color: '#334155' }}>
            {aiText?.executive_summary}
          </p>
        </section>

        {/*  OVERALL FLEET PERFORMANCE */}
        <section style={{ marginBottom: '35px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '12px', textTransform: 'uppercase' }}>
            🚚 Overall Fleet Performance - Week {meta.absoluteWeek}
          </h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '20px', backgroundColor: '#fff' }}>
            <thead>
              <tr style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
                <th style={{ padding: '12px 10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Activity Metric</th>
                <th style={{ padding: '12px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>Weekly Total</th>
                <th style={{ padding: '12px 10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Operational Breakdown</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Total Trips Volume</td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: '900', fontSize: '14px', color: '#1e3a8a' }}>
                  {metrics?.trips_breakdown?.total}
                </td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0', color: '#000103', fontWeight: 'bolder' }}>
                   <strong>{metrics?.trips_breakdown?.non_it}</strong> Non-IT Jobs |  <strong>{metrics?.trips_breakdown?.it}</strong> Internal Transfers
                </td>
              </tr>
              <tr>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Active Truck Deployment</td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: '900', fontSize: '14px', color: '#1e3a8a' }}>
                  {metrics?.trucks_insight?.total}
                </td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0', color: '#000205', fontWeight: 'bolder' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div> <strong>{metrics?.trucks_insight?.onlyRevenue}</strong> (Non-IT Jobs)</div>
                    <div> <strong>{metrics?.trucks_insight?.onlyIT}</strong> (IT)</div>
                    <div style={{ fontSize: '10px', color: '#16a34a', background: '#f0fdf4', padding: '4px 8px', borderRadius: '4px', border: '1px dashed #16a34a', marginTop: '4px', display: 'inline-block' }}>
                      <strong>{metrics?.trucks_insight?.doubleDuty}</strong> Double Duty (Performed Both Tasks)
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bolder' }}>Overall Fleet Utilization</td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bolder' }}>{metrics?.utilization}%</td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontSize: '10px', color: '#010305', fontWeight: 'bolder' }}>Percentage of 90-truck capacity active this week</td>
              </tr>
              <tr>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bolder' }}>Average Trip per Truck (T/T)</td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bolder' }}>{metrics?.avgTripPerTruck}</td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontSize: '10px', color: '#010305', fontWeight: 'bolder' }}>Average Non-IT trips per active Non-IT truck</td>
              </tr>
            </tbody>
          </table>

    <div style={{ padding: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
        <strong style={{ color: '#1e3a8a', fontSize: '13px' }}>Financial Performance Statement</strong>

        <span style={{ fontSize: '10px', color: '#64748b' }}>Week {metrics?.absoluteWeek || '-'} Summary</span>
    </div>
    
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        {/* Gross Profit Block */}
        <div>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Gross Profit</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>{fmt(metrics?.grossProfit)}</div>
            <div style={{ fontSize: '10px', marginTop: '4px', color: metrics?.financialWoW?.gross?.pct >= 0 ? '#16a34a' : '#dc2626' }}>
                             {metrics?.financialWoW?.gross?.pct >= 0 ? '↑' : '↓'}{Math.abs(metrics?.financialWoW?.gross?.pct)}% 
                <span style={{ color: '#64748b', marginLeft: '4px' }}>(prev: {fmt(metrics?.financialWoW?.gross?.lastWeek)})</span>
            </div>
        </div>

        {/* Maintenance Block */}
        <div>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Maintenance</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>- {fmt(metrics?.maintenance)}</div>
            
            <div style={{ fontSize: '10px', marginTop: '4px', color: metrics?.financialWoW?.maintenance?.pct <= 0 ? '#16a34a' : '#dc2626' }}>
                {metrics?.financialWoW?.maintenance?.pct >= 0 ? '↑' : '↓'}{Math.abs(metrics?.financialWoW?.maintenance?.pct)}%
                <span style={{ color: '#64748b', marginLeft: '4px' }}>(prev: {fmt(metrics?.financialWoW?.maintenance?.lastWeek)})</span>
            </div>
        </div>

        {/* Net Profit Block */}
        <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 'bold', textTransform: 'uppercase' }}>Net Profit</div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: '#16a34a' }}>{fmt(metrics?.netProfit)}</div>
            <div style={{ fontSize: '11px', marginTop: '4px', color: metrics?.financialWoW?.net?.pct >= 0 ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
                {metrics?.financialWoW?.net?.pct >= 0 ? '↑' : '↓'}{Math.abs(metrics?.financialWoW?.net?.pct)}%
                <span style={{ color: '#64748b', fontWeight: 'normal', marginLeft: '4px' }}>(prev: {fmt(metrics?.financialWoW?.net?.lastWeek)})</span>
            </div>
        </div>
    </div>
</div>
        </section>

    {/*  TREND ANALYSIS */}
<section style={{ marginBottom: '40px' }}>
  <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '15px' }}>
    📈 {metrics?.trends?.length}-Week Trend Analysis: Commercial Performance (Non-IT)
  </h3>
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '20px' }}>
      <thead>
        <tr style={{ backgroundColor: '#f1f5f9', color: '#1e3a8a' }}>
          <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Performance Metric</th>
        
          {metrics?.trends?.map((t, i) => (
            <th key={`head-${i}`} style={{ padding: '10px', border: '1px solid #ddd', backgroundColor: i === metrics.trends.length - 1 ? '#eff6ff' : 'transparent' }}>
              {t.week}
            </th>
          ))}
         
          {metrics?.trends?.map((t, i) => {
            if (i === 0) return null;
            const isLatest = i === metrics.trends.length - 1;
            return (
              <th key={`pct-head-${i}`} style={{ 
                padding: '5px', border: '1px solid #ddd', fontSize: '9px', 
                backgroundColor: isLatest ? '#1e3a8a' : '#f8fafc', 
                color: isLatest ? '#fff' : '#1e3a8a' 
              }}>
                % Change {t.week} vs {metrics.trends[i-1].week.replace('Week', '')}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {[
          { label: 'Non-IT Trip Volume', key: 'trips', isFmt: false },
          { label: 'Total Net Profit', key: 'profit', isFmt: true },
          { label: 'Active Truck Fleet', key: 'active_trucks', isFmt: false },
          { label: 'T/T Efficiency (Yield)', key: 'efficiency', isFmt: false }
        ].map((row, rowIdx) => (
          <tr key={rowIdx} style={{ backgroundColor: rowIdx === 3 ? '#f8fafc' : 'transparent' }}>
            <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>{row.label}</td>
            
        
            {metrics?.trends?.map((t, i) => (
              <td key={`val-${i}`} style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', fontWeight: rowIdx === 3 ? 'bold' : 'normal' }}>
                {row.isFmt ? fmt(t[row.key]) : t[row.key]}
              </td>
            ))}

      
            {metrics?.trends?.map((t, i) => {
              if (i === 0) return null;
              const current = t[row.key];
              const previous = metrics.trends[i-1][row.key];
              const isLatest = i === metrics.trends.length - 1;

              return (
                <td key={`chg-${i}`} style={{ 
                  padding: '10px', border: '1px solid #ddd', textAlign: 'center',
                  fontWeight: isLatest ? 'bold' : 'normal',
                  backgroundColor: isLatest ? '#f0f9ff' : 'transparent',
                  color: isLatest && rowIdx === 3 ? '#1e3a8a' : 'inherit'
                }}>
                  {calcChange(current, previous)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  
  <div style={{ height: '350px', border: '1px solid #f1f5f9', padding: '20px', borderRadius: '12px', background: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
    <div style={{ marginBottom: '10px' }}>
      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>VOLUME VS. YIELD ANALYSIS</span>
    </div>
    <Bar data={trendData} options={chartOptions} />
  </div>
</section>
 
       <div style={{ marginTop: '30px', padding: '25px', background: '#ffffff', border: '1px solid #e2e8f0', borderBottom: '0px', borderRadius: '12px', boxShadow: '0 0px 3px 0 rgba(0, 0, 0, 0.1)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{ background: '#1e3a8a', padding: '8px', borderRadius: '8px' }}>🚀</div>
        <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>4-Weeks Trend Observations</h3>
    </div>

    {(() => {
        const trends = metrics?.trends || [];
        if (trends.length < 4) return <p style={{ fontSize: '12px', color: '#64748b' }}>Insufficient data for a full 4-week narrative.</p>;

        const t = trends; 
        
        
        const getPct = (curr, prev) => {
            if (!prev) return 0;
            return Math.round(((curr - prev) / prev) * 100);
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', color: '#334155', fontSize: '12px', lineHeight: '1.6' }}>
                
  
                <div>
                    <strong style={{ color: '#1e3a8a', display: 'block', marginBottom: '4px' }}>📊 Operational Flow:</strong>
                    Total trips moved from {t[0].trips} in {t[0].week} to {t[1].trips} ({getPct(t[1].trips, t[0].trips)}%), 
                    then shifted to {t[2].trips} ({getPct(t[2].trips, t[1].trips) >= 0 ? '+' : ''}{getPct(t[2].trips, t[1].trips)}%) 
                    and settled at {t[3].trips} in {t[3].week} ({getPct(t[3].trips, t[2].trips)}%).
                    This pattern indicates {Math.abs(getPct(t[3].trips, t[0].trips)) < 5 ? "a period of stabilization" : "significant operational scaling"} 
                    across the 4-weeks WOW comparison.
                </div>

             
                <div>
                    <strong style={{ color: '#16a34a', display: 'block', marginBottom: '4px' }}>💰 Financial Performance:</strong>
                    Net profit stood at {fmt(t[0].profit)} in {t[0].week}, reached {fmt(t[1].profit)} ({getPct(t[1].profit, t[0].profit)}%), 
                    dipped to {fmt(t[2].profit)} ({getPct(t[2].profit, t[1].profit)}%), before closing at {fmt(t[3].profit)} in {t[3].week} ({getPct(t[3].profit, t[2].profit)}%).
                    {getPct(t[3].profit, t[2].profit) > 50 ? " The sharp rebound in the final week suggests a strong recovery in cost control or job margins." : ""}
                </div>

         
                <div>
                    <strong style={{ color: '#010307', display: 'block', marginBottom: '4px' }}>🚚 Capacity Deployment:</strong>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        <li>Active trucks moved from {t[0].active_trucks} to {t[1].active_trucks} ({getPct(t[1].active_trucks, t[0].active_trucks)}%) in the first half.</li>
                        <li>Capacity {t[3].active_trucks > t[2].active_trucks ? "expanded" : "eased"} to {t[3].active_trucks} trucks in {t[3].week}, 
                        reflecting a {Math.abs(getPct(t[3].active_trucks, t[2].active_trucks))}% {t[3].active_trucks > t[2].active_trucks ? "increase" : "normalization"} in fleet utilization.</li>
                    </ul>
                </div>

                <div>
                    <strong style={{ color: '#ca8a04', display: 'block', marginBottom: '4px' }}>⚡ T/T Efficiency (Yield):</strong>
                    The fleet efficiency started at {t[0].efficiency} and reached {t[3].efficiency} T/T by the end of {t[3].week}.
                    {parseFloat(t[3].efficiency) > parseFloat(t[0].efficiency) 
                        ? ` This confirms a major productivity breakthrough, with trucks delivering significantly more trips per unit through better dispatching.`
                        : ` This indicates a steady state of asset utilization per active truck.`
                    }
                </div>

            </div>
        );
    })()}
</div>

{/* BRAND PERFORMANCE BREAKDOWN */}
<section style={{ marginBottom: '40px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
  <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '10px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '10px' }}>
    🚚 Brand Performance Breakdown: Utilization and Efficiency
  </h3>

  <p style={{ fontSize: '12px', color: '#475569', marginBottom: '15px', lineHeight: '1.6' }}>
    The <strong>{metrics?.trips_breakdown?.non_it} revenue trips</strong> this week were covered by the active fleet, 
    with performance metrics detailed below based on brand utilization.
  </p>

  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '25px' }}>
    <thead>
      <tr style={{ backgroundColor: '#1e3a8a', color: '#fff' }}>
        <th style={{ padding: '12px 10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Brand (Total Trucks)</th>
        <th style={{ padding: '12px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>Active Trucks</th>
        <th style={{ padding: '12px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>% of Utilized Trucks</th>
        <th style={{ padding: '12px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>Total Trips</th>
        <th style={{ padding: '12px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>% of Total Trips</th>
        <th style={{ padding: '12px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>T/T Efficiency</th>
      </tr>
    </thead>
    <tbody>
      {metrics?.brandPerformance?.map((b, i) => (
        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
          <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>
            {b.name} ({b.capacity})
            {b.utilization_pct >= 80 && <BarChartBig size={14} style={{ marginLeft: '8px', color: '#16a34a', verticalAlign: 'middle' }} />}
          </td>
          <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{b.active_trucks}</td>
          <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{b.utilization_pct}%</td>
          <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold' }}>{b.trips}</td>
          <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{b.trip_share}%</td>
          <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: '#1e3a8a' }}>{b.efficiency}</td>
        </tr>
      ))}
      
    
      {(() => {
        const tableActiveTotal = metrics?.brandPerformance?.reduce((sum, b) => sum + b.active_trucks, 0) || 0;
        const tableTripsTotal = metrics?.brandPerformance?.reduce((sum, b) => sum + b.trips, 0) || 0;
        
        return (
          <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', borderTop: '2px solid #1e3a8a' }}>
            <td style={{ padding: '12px 10px', border: '1px solid #cbd5e1' }}>TOTAL (90)</td>
            <td style={{ padding: '12px 10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{tableActiveTotal}</td>
            <td style={{ padding: '12px 10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                {Math.round((tableActiveTotal / 90) * 100)}%
            </td>
            <td style={{ padding: '12px 10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{tableTripsTotal}</td>
            <td style={{ padding: '12px 10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>100%</td>
            <td style={{ padding: '12px 10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                {tableActiveTotal > 0 ? (tableTripsTotal / tableActiveTotal).toFixed(1) : '0.0'}
            </td>
          </tr>
        );
      })()}
    </tbody>
  </table>

 {/* AI-DRIVEN INSIGHTS */}
<div style={{ padding: '20px', backgroundColor: '#eff6ff', borderLeft: '5px solid #1e3a8a', borderRadius: '4px' }}>
  <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '15px', textTransform: 'uppercase' }}>
    AI Operational Analysis
  </h4>
  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
    {metrics?.brandPerformance?.map((b, i) => {
      const name = b.name.toUpperCase();
      const efficiency = parseFloat(b.efficiency);
      const utilization = b.utilization_pct;
      
      let insight = "";

      //  TOP PERFORMER LOGIC (Highest Efficiency)
      const isTopEfficiency = b.efficiency === Math.max(...metrics.brandPerformance.map(bp => bp.efficiency)).toFixed(1);
      
      if (name.includes('HOWO')) {
        insight = `remains the strategic backbone of the fleet. With ${utilization}% utilization and a T/T efficiency of ${efficiency}, it is currently driving ${b.trip_share}% of total commercial volume. Stability in this segment is critical for overall targets.`;
      } 
      
      //  LOW ACTIVATION BUT GOOD EFFICIENCY (Growth Opportunity)
      else if (utilization < 60 && efficiency >= 4.0) {
        insight = `is showing strong per-unit productivity (${efficiency} trips/truck), but overall impact is throttled by low activation (${utilization}%). Bringing more units online in this category could significantly boost weekly revenue.`;
      }

      // UNDERPERFORMANCE LOGIC (High Activation, Low Efficiency)
      else if (utilization > 60 && efficiency < 3.8) {
        insight = `is currently exhibiting operational friction. Despite ${utilization}% activation, efficiency is lagging at ${efficiency}. This suggests potential issues with dispatch turnaround times or maintenance-related delays for this brand.`;
      }

      // SCALE IMPACT LOGIC (Small Brands)
      else if (b.capacity <= 15) {
        insight = `delivered ${b.trips} trips with an efficiency of ${efficiency}. While performing steadily, its scale impact remains limited by the small fleet size. It is serving as an effective secondary support brand.`;
      }

      // DEFAULT FALLBACK
      else {
        insight = `contributed ${b.trips} trips (${b.trip_share}% share). With a T/T efficiency of ${efficiency}, it maintains a balanced role within the operational workflow.`;
      }

      return (
        <div key={i} style={{ fontSize: '11.5px', color: '#1e293b', lineHeight: '1.6' }}>
          <span style={{ color: '#1e3a8a', fontWeight: 'bold' }}>{b.name}:</span> {insight}
        </div>
      );
    })}
  </div>
</div>
</section>

{/* TRIPS WoW CHANGE BY BRAND */}
<section style={{ marginBottom: '40px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
  <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '15px', textTransform: 'uppercase' }}>
    📈 Trips WoW Change by Brand 
  </h3>

  {(() => {
    const currentWk = parseInt(metrics?.absoluteWeek) || 1;
    const availableWeeks = [];
    for (let i = Math.max(1, currentWk - 3); i <= currentWk; i++) {
      availableWeeks.push(i);
    }

    return (
      <>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '25px' }}>
          <thead>
            <tr style={{ backgroundColor: '#475569', color: '#fff' }}>
              <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Brand</th>
              {availableWeeks.map((wk) => (
                <th key={wk} style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                  Wk {String(wk).padStart(2, '0')} Trips/(T)
                </th>
              ))}
              {availableWeeks.map((wk, idx) => {
                if (idx === 0) return null;
                const prevWk = availableWeeks[idx - 1];
                return (
                  <th key={`chg-${wk}`} style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                    % Chg ({String(wk).padStart(2, '0')}/{String(prevWk).padStart(2, '0')})
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {metrics?.brandTrendData?.map((b, i) => {
              const displayData = (b.data || []).slice(-availableWeeks.length);
              const displayChanges = (b.changes || []).slice(-(availableWeeks.length - 1));

              return (
                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>{b.name}</td>
                  {displayData.map((w, idx) => (
                    <td key={idx} style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                      {w.trips || 0} / ({w.trucks || 0})
                    </td>
                  ))}
                  {displayChanges.map((c, idx) => (
                    <td key={idx} style={{ 
                      padding: '10px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold',
                      color: c > 0 ? '#16a34a' : c < 0 ? '#dc2626' : '#64748b' 
                    }}>
                      {c > 0 ? `+${c}%` : `${c}%`}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* AI TREND SUMMARY NARRATIVE */}
        <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderLeft: '5px solid #1e3a8a', borderRadius: '8px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '20px', textTransform: 'uppercase' }}>
            Trend Summary (Weeks {String(availableWeeks[0]).padStart(2, '0')} – {String(availableWeeks[availableWeeks.length - 1]).padStart(2, '0')})
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            {metrics?.brandTrendData?.map((b, i) => {
              const d = b.data?.slice(-availableWeeks.length) || [];
              const c = b.changes?.slice(-(availableWeeks.length - 1)) || [];
              
           
              const getTone = (val, success, neutral, fail) => val > 15 ? success : val < -15 ? fail : neutral;

              return (
                <div key={i} style={{ fontSize: '11px', lineHeight: '1.6', color: '#334155' }}>
                  <div style={{ fontWeight: 'bold', color: '#1e3a8a', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', display: 'inline-block' }}>
                    {b.name}
                  </div>
                  
                 
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            
                    {d.length >= 2 && (
                      <p style={{ margin: 0 }}>
                        Trips {c[0] >= 0 ? 'increased' : 'declined'} from {d[0].trips} ({d[0].trucks} trucks) in Week {availableWeeks[0]} to {d[1].trips} ({d[1].trucks} trucks) in Week {availableWeeks[1]} ({c[0] >= 0 ? '+' : ''}{c[0]}%).
                      </p>
                    )}

                 
                    {d.length >= 3 && (
                      <p style={{ margin: 0 }}>
                        {getTone(c[1], 'Strong expansion', 'Continued performance', 'Sharp contraction')} to {d[2].trips} trips with {d[2].trucks} trucks in Week {availableWeeks[2]} ({c[1] >= 0 ? '+' : ''}{c[1]}%).
                      </p>
                    )}

          
                    {d.length >= 4 && (
                      <p style={{ margin: 0 }}>
                        {getTone(c[2], 'Further growth', 'Steady output', 'Slight correction')} to {d[3].trips} trips with {d[3].trucks} trucks in Week {availableWeeks[3]} ({c[2] >= 0 ? '+' : ''}{c[2]}%), 
                        {c[2] >= 0 
                          ? ' showing sustained scaling and strong operational performance.' 
                          : ' indicating volatility in deployment and demand.'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  })()}
</section>

        {/* OPERATIONAL WORKHORSES (TOP VOLUME) */}
        <section style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#16a34a', marginBottom: '10px', textTransform: 'uppercase' }}>🏅 Top performance </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '15px' }}>
            <thead>
              <tr style={{ backgroundColor: '#16a34a', color: '#fff' }}>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Truck No</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Trips</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Brand</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Fleet Manager</th>
              </tr>
            </thead>
            <tbody>
              {metrics?.topVolume?.map((t, i) => (
                <tr key={i}>
                  <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>{t.id}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>{t.trips}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>{t.brand}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>{t.fm}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', fontSize: '11px', fontStyle: 'italic', border: '1px solid #bbf7d0' }}>
            <Zap size={14} className="inline mr-2 text-green-600"/>
            <strong>Top Performance Insight:</strong> {aiText?.volume_insights}
          </div>
        </section>

        {/* PROFITABILITY LEADERS (NON-IT vs IT SPLIT) */}
        <section style={{ marginBottom: '40px', pageBreakBefore: 'always' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
            <div>
              <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '10px', textTransform: 'uppercase' }}>💰 Top 10 Profit (Non-IT)</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e3a8a', color: '#fff' }}>
                    <th style={{ padding: '6px', border: '1px solid #ddd' }}>Truck</th>
                    <th style={{ padding: '6px', border: '1px solid #ddd' }}>Trips</th>
                    <th style={{ padding: '6px', border: '1px solid #ddd' }}>Profit</th>
                    <th style={{ padding: '6px', border: '1px solid #ddd' }}>Manager</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics?.topNonItProfit?.map((t, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold' }}>{t.id}</td>
                      <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold' }}>{t.trips}</td>
                      <td style={{ padding: '6px', border: '1px solid #ddd', color: '#16a34a', fontWeight: 'bold' }}>{fmt(t.profit)}</td>
                      <td style={{ padding: '6px', border: '1px solid #ddd' }}>{t.fm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' }}>🛠️ Top 10 Profit (IT)</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#64748b', color: '#fff' }}>
                    <th style={{ padding: '6px', border: '1px solid #ddd' }}>Truck</th>
                    <th style={{ padding: '6px', border: '1px solid #ddd' }}>Trips</th>
                    <th style={{ padding: '6px', border: '1px solid #ddd' }}>Profit</th>
                    <th style={{ padding: '6px', border: '1px solid #ddd' }}>Manager</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics?.topItProfit?.map((t, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold' }}>{t.id}</td>
                      <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold' }}>{t.trips}</td>
                      <td style={{ padding: '6px', border: '1px solid #ddd', color: '#1e3a8a', fontWeight: 'bold' }}>{fmt(t.profit)}</td>
                      <td style={{ padding: '6px', border: '1px solid #ddd' }}>{t.fm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '11px', fontStyle: 'italic', border: '1px solid #e2e8f0' }}>
            <TrendingUp size={14} className="inline mr-2 text-amber-600"/>
            <strong>Profitability Insight:</strong> {aiText?.profit_insights}
          </div>
        </section>

{/*  FLEET MANAGER INSIGHT (REVENUE AUDIT) */}
<section style={{ marginBottom: '40px' }}>
  <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
    <Users size={18} /> 👥 Fleet Manager Insight – Week {meta?.absoluteWeek || metrics?.absoluteWeek} (Revenue Trips Only)
  </h3>
  

  <p style={{ fontSize: '11px', color: '#475569', marginBottom: '15px', fontWeight: '500' }}>
    Compared to previous, the trucks used by the fleet managers for commercial operations 
    <span style={{ color: (metrics?.truckChange || 0) < 0 ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>
      {(metrics?.truckChange || 0) < 0 ? ` decreased by ${Math.abs(metrics?.truckChange)}` : ` increased by ${metrics?.truckChange || 0}`}
    </span>
  </p>

  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', marginBottom: '20px' }}>
    <thead>
      <tr style={{ backgroundColor: '#1e3a8a', color: '#fff' }}>
        <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Fleet Managers (Trucks)</th>
        <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Active Trucks</th>
        <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>% of Util. Rate</th>
        <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Revenue Trips</th>
        <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>% of Commercial Volume</th>
        <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>T/T Efficiency</th>
        <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>% Met Target (3+)</th>
        <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Net Profit</th>
        <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Avg. Profit/Truck</th>
      </tr>
    </thead>
    <tbody>
      {metrics?.managers?.map((m, i) => {
      
        const revTrips = m?.trips || 0; 
        const active = m?.active_trucks || 0;
        const capacity = m?.total_capacity || 1;
        const totalCommercialVolume = metrics?.trips_breakdown?.non_it || 1;
        const avgProfit = active > 0 ? (m?.profit || 0) / active : 0;

        return (
          <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
            <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold', color: '#1e293b' }}>
              {m.name} ({capacity})
            </td>
            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
              {active} 
              <span style={{ fontSize: '8px', color: (m.truck_diff || 0) < 0 ? '#dc2626' : '#16a34a', marginLeft: '4px' }}>
                ({(m.truck_diff || 0) < 0 ? '↓' : '↑'}{Math.abs(m.truck_diff || 0)})
              </span>
            </td>
            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: '600' }}>
              {Math.round((active / capacity) * 100)}%
            </td>
            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
              {revTrips}
            </td>
            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', color: '#64748b' }}>
              {Math.round((revTrips / totalCommercialVolume) * 100)}%
            </td>
            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
              {m.efficiency || '0.0'}
            </td>
            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
              <div style={{ 
                padding: '2px 6px', 
                borderRadius: '4px', 
                backgroundColor: (m.met_target_pct || 0) >= 80 ? '#f0fdf4' : '#fff7ed', 
                color: (m.met_target_pct || 0) >= 80 ? '#16a34a' : '#c2410c', 
                display: 'inline-block', 
                fontWeight: 'bold',
                border: `1px solid ${(m.met_target_pct || 0) >= 80 ? '#bbf7d0' : '#fed7aa'}`
              }}>
                {m.met_target_pct || 0}%
              </div>
            </td>
            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>
              {fmt(m.profit || 0)}
            </td>
            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: '600', color: '#475569' }}>
              {fmt(avgProfit)}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>


  <div style={{ padding: '20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
    <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '12px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
      <Activity size={14} /> Fleet Manager Commercial Observations
    </h4>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {metrics?.managers?.map((m, i) => {
          const util = Math.round(((m?.active_trucks || 0) / (m?.total_capacity || 1)) * 100);
          const revTrips = m.trips || 0;
          const commercialShare = Math.round((revTrips / (metrics?.trips_breakdown?.non_it || 1)) * 100);
          const avgP = (m?.active_trucks || 0) > 0 ? (m?.profit || 0) / m.active_trucks : 0;
          
          return (
            <div key={i} style={{ fontSize: '11px', color: '#334155', lineHeight: '1.6', paddingLeft: '10px', borderLeft: '3px solid #cbd5e1' }}>
              <strong style={{ color: '#1e3a8a' }}>{m.name}:</strong> Managed {m.active_trucks} active trucks ({util}% utilization). 
              Contributed <span style={{ fontWeight: 'bold' }}>{revTrips} trips</span> ({commercialShare}% of commercial volume) 
              with a T/T efficiency of <span style={{ color: parseFloat(m.efficiency) >= 4.5 ? '#16a34a' : '#334155' }}>{m.efficiency}</span>. 
              Notably, {m.met_target_pct}% of the assigned fleet achieved the 3+ commercial trips target. 
              Financial yield resulted in {fmt(m.profit)} net profit, averaging {fmt(avgP)} per truck.
            </div>
          );
      })}
    </div>
  </div>
</section>

{/* TRUCK PROFITABILITY: QUARTILE ANALYSIS (TOP 25% vs BOTTOM 25%) */}
<section style={{ marginBottom: '40px' }}>
  <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '15px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
    <Target size={18} /> Truck Profitability Summary (Week {meta.absoluteWeek})
  </h3>
  
  <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
    
    {/* TOP 25% TABLE */}
    <div>
      <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        🏅 TOP 25% NET PROFIT GENERATORS
      </h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
        <thead>
          <tr style={{ backgroundColor: '#16a34a', color: '#fff' }}>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Truck No</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Trips</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>FM</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Brand</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Gross Profit</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Maintenance</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Net Profit</th>
          </tr>
        </thead>
        <tbody>
          {metrics?.top25Percent?.map((t, i) => (
            <tr key={i} style={{ backgroundColor: i === 0 ? '#f0fdf4' : i % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
              <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>{t.id}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
                {t.trips}
                {t.it_trips > 0 && (
                  <span style={{ fontSize: '8px', color: t.trips === t.it_trips ? '#1e40af' : '#64748b', marginLeft: '4px', backgroundColor: t.trips === t.it_trips ? '#eff6ff' : 'transparent', padding: '1px 3px', borderRadius: '3px' }}>
                    {t.trips === t.it_trips ? 'IT ONLY' : `(${t.it_trips} IT)`}
                  </span>
                )}
              </td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{t.fm || 'N/A'}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{t.brand || 'N/A'}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{fmt(t.gross_profit || (t.net_profit + (t.maintenance || 0)))}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#dc2626' }}>{fmt(t.maintenance || 0)}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>{fmt(t.net_profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* BOTTOM 25% TABLE - Now using Slate/Red theme to distinguish */}
    <div>
      <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#dc2626', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Activity size={16} /> ⚠️ BOTTOM 25% PERFORMANCE (LOWEST NET)
      </h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
        <thead>
          <tr style={{ backgroundColor: '#475569', color: '#fff' }}>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Truck No</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Trips</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Fleet Manager</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Brand</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Gross Profit</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Maintenance</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Net Profit</th>
          </tr>
        </thead>
        <tbody>
          {metrics?.bottom25Percent?.map((t, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#fff1f2' }}>
              <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>{t.id}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
                {t.trips}
                {t.it_trips > 0 && (
                  <span style={{ fontSize: '8px', color: t.trips === t.it_trips ? '#991b1b' : '#64748b', marginLeft: '4px', backgroundColor: t.trips === t.it_trips ? '#fef2f2' : 'transparent', padding: '1px 3px', borderRadius: '3px' }}>
                    {t.trips === t.it_trips ? 'IT ONLY' : `(${t.it_trips} IT)`}
                  </span>
                )}
              </td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{t.fm || 'N/A'}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{t.brand || 'N/A'}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{fmt(t.gross_profit || (t.net_profit + (t.maintenance || 0)))}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#dc2626' }}>{fmt(t.maintenance || 0)}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', color: t.net_profit < 0 ? '#dc2626' : '#92400e' }}>{fmt(t.net_profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>

</section>
{/*  FINANCIAL LEAKAGE: NEGATIVE PROFIT & ROI ANALYSIS */}
<section style={{ marginBottom: '40px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#dc2626', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <AlertCircle size={20} /> TRUCKS WITH NEGATIVE NET PROFIT
    </h3>
    <span style={{ fontSize: '10px', backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' }}>
      {metrics?.negativeProfitTrucks?.length || 0} TRUCKS AT RISK
    </span>
  </div>

  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '20px' }}>
    <thead>
      <tr style={{ backgroundColor: '#f8fafc', color: '#64748b' }}>
        <th style={{ padding: '12px', borderBottom: '2px solid #edf2f7', textAlign: 'left' }}>Truck No</th>
        <th style={{ padding: '12px', borderBottom: '2px solid #edf2f7', textAlign: 'left' }}>Brand</th>
        <th style={{ padding: '12px', borderBottom: '2px solid #edf2f7', textAlign: 'left' }}>Fleet Manager</th>
        <th style={{ padding: '12px', borderBottom: '2px solid #edf2f7', textAlign: 'center' }}>Trips</th>
        <th style={{ padding: '12px', borderBottom: '2px solid #edf2f7', textAlign: 'right' }}>Gross Profit</th>
        <th style={{ padding: '12px', borderBottom: '2px solid #edf2f7', textAlign: 'right' }}>Maintenance</th>
        <th style={{ padding: '12px', borderBottom: '2px solid #edf2f7', textAlign: 'right' }}>Net Loss</th>
      </tr>
    </thead>
    <tbody>
      {metrics?.negativeProfitTrucks?.length > 0 ? (
        metrics.negativeProfitTrucks.map((t, i) => {

          const roi = t.gross_profit > 0 ? ((t.maintenance / t.gross_profit) * 100).toFixed(0) : '100+';
          
          return (
            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '12px', fontWeight: 'bold' }}>{t.truck_number}</td>
              <td style={{ padding: '12px' }}>{t.brand}</td>
              <td style={{ padding: '12px', textTransform: 'capitalize' }}>{t.fleet_manager?.toLowerCase()}</td>
              <td style={{ padding: '12px', textAlign: 'center' }}>{t.total_trips}</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>₦{t.gross_profit.toLocaleString()}</td>
              <td style={{ padding: '12px', textAlign: 'right', color: '#dc2626' }}>₦{t.maintenance.toLocaleString()}</td>
              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#dc2626', backgroundColor: '#fff5f5' }}>
                -₦{Math.abs(t.net_profit).toLocaleString()}
              </td>
            </tr>
          );
        })
      ) : (
        <tr>
          <td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#16a34a' }}>
            <strong>All trucks are currently profitable. No units recorded a net loss.</strong>
          </td>
        </tr>
      )}
    </tbody>
  </table>

</section>


        {/* FOOTER */}
        <div style={{ marginTop: '50px', background: '#f8fafc', padding: '20px', borderTop: '4px solid #1e3a8a', borderRadius: '0 0 10px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <Sparkles size={18} color="#1e3a8a" />
              <strong style={{ fontSize: '12px', color: '#1e3a8a' }}>AI INSIGHTS</strong>
            </div>
            <p style={{ fontSize: '11px', color: '#475569', margin: 0, lineHeight: '1.5' }}>{aiText?.projection}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-100 min-h-screen p-10 font-sans">
      <div className="max-w-[1100px] mx-auto space-y-6">
        <FilterBar onFilterChange={handleFilterChange} />
        <div className="flex justify-between items-center no-print">
          <Link to="/" className="text-slate-500 font-bold flex items-center gap-2 transition-colors hover:text-blue-600">
            <ArrowLeft size={18}/> BACK TO DASHBOARD
          </Link>
          <div className="flex gap-4">
            <button onClick={downloadPDF} className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg hover:bg-red-700 transition-all flex items-center gap-2">
              <Download size={16}/> DOWNLOAD PDF
            </button>
            <button onClick={downloadWord} className="bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg hover:bg-blue-800 transition-all flex items-center gap-2">
              <FileText size={16}/> EXPORT WORD
            </button>
          </div>
        </div>
        <div className="flex justify-center">{renderContent()}</div>
      </div>
    </div>
  );
};

export default ReportPage;