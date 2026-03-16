import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { 
    ArrowLeft, Download, FileText, Calendar, Sparkles, 
    Activity, Users, Target, Zap, TrendingUp, AlertCircle, 
    Bold
} from 'lucide-react';

const isProduction = import.meta.env.PROD; 

const api = axios.create({
    baseURL: isProduction ? import.meta.env.VITE_API_URL : 'http://localhost:5000', 
    headers: { 'Content-Type': 'application/json' },
});

const formatNaira = (num) => `₦${((num || 0) / 1000000).toFixed(1)}M`;
const formatNairaFull = (num) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(num || 0);
const compactFmt = (v) => {
  const val = Number(v || 0);
  if (Math.abs(val) >= 1000000) {
    return `₦${(val / 1000000).toFixed(1)}M`;
  } else if (Math.abs(val) >= 1000) {
    return `₦${(val / 1000).toFixed(0)}K`;
  }
  return `₦${val.toFixed(0)}`;
};
const MonthlyReportDashboard = () => {
    const [selectedMonth, setSelectedMonth] = useState("2026-01");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const reportRef = useRef();

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
            console.error("Failed to fetch report data:", err);
        } finally {
            setLoading(false);
        }
    };

    // --- PDF EXPORT (Fixed for perfect alignment and no cut-offs) ---
    const downloadPDF = async () => {
        const element = reportRef.current;
        
        // 1. Save the original styles so we can restore them later
        const originalWidth = element.style.width;
        const originalMaxWidth = element.style.maxWidth;
        const originalMargin = element.style.margin;

        // 2. Force the container to a large desktop width (1440px) 
        // This gives the tables enough room to naturally expand without needing scrollbars
        const targetWidth = 1440; 
        element.style.width = `${targetWidth}px`;
        element.style.maxWidth = `${targetWidth}px`;
        element.style.margin = '0'; // Remove centering to prevent the "shifting" bug

        // 3. Take the snapshot
        const canvas = await html2canvas(element, { 
            scale: 2, // High resolution for crisp text
            useCORS: true,
            windowWidth: targetWidth,
            scrollY: -window.scrollY,
            x: 0, // Force snapshot to start exactly at the left edge
            y: 0
        });
        
        // 4. Instantly restore the page back to normal for the user
        element.style.width = originalWidth; 
        element.style.maxWidth = originalMaxWidth;
        element.style.margin = originalMargin;

        // 5. Generate the PDF
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF('p', 'pt', 'a4'); 
        
        // Scale the 1440px wide image proportionally down to fit the A4 page width
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width; 
        
        let position = 0;
        const pageHeight = pdf.internal.pageSize.getHeight();

        if (pdfHeight > pageHeight) {
            // Multi-page PDF logic
            while (position < pdfHeight) {
                pdf.addImage(imgData, 'JPEG', 0, position * -1, pdfWidth, pdfHeight);
                position += pageHeight;
                if (position < pdfHeight) pdf.addPage();
            }
        } else {
            // Single page PDF
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }
        
        pdf.save(`Monthly_Fleet_Report_${selectedMonth}.pdf`);
    };

    // --- WORD EXPORT ---
    const downloadWord = () => {
        if (!reportRef.current) return;

        const fileName = `Monthly_Fleet_Report_${selectedMonth}.doc`;

        const fileHeader = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' 
                  xmlns:w='urn:schemas-microsoft-com:office:word' 
                  xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
              <meta charset='utf-8'>
              <style>
                @page Section1 {
                  size: 595.3pt 841.9pt; /* A4 */
                  margin: 1.0in 0.75in 1.0in 0.75in;
                  mso-header-margin: 35.4pt;
                  mso-footer-margin: 35.4pt;
                }
                div.Section1 { page: Section1; }
                body { font-family: "Calibri", "Segoe UI", sans-serif; font-size: 11pt; }
                table { border-collapse: collapse; width: 100%; border: 1pt solid #e2e8f0; margin-bottom: 15pt; }
                th { background-color: #1e3a8a; color: white; padding: 8pt; border: 1pt solid #ffffff; text-align: left; font-size: 10pt; }
                td { padding: 8pt; border: 1pt solid #e2e8f0; vertical-align: top; font-size: 10pt; }
                h1 { color: #1e3a8a; font-size: 22pt; margin-bottom: 5pt; }
                h3 { color: #1e3a8a; font-size: 14pt; border-bottom: 1.5pt solid #1e3a8a; padding-bottom: 3pt; margin-top: 20pt; text-transform: uppercase; }
                .stat-box { border: 1pt solid #e2e8f0; background-color: #f8fafc; padding: 10pt; }
                .text-green { color: #16a34a; font-weight: bold; }
                .text-red { color: #dc2626; font-weight: bold; }
                .page-break { page-break-before: always; }
              </style>
            </head>
            <body><div class="Section1">`;

        const fileFooter = "</div></body></html>";

        // Clone the report and clean it
        const clone = reportRef.current.cloneNode(true);
        
        // Remove things Word hates (Charts, SVGs, Buttons)
        const elementsToRemove = clone.querySelectorAll('.no-print, canvas, svg, button');
        elementsToRemove.forEach(el => el.remove());

        // Fix Layout: Convert Grid/Flex to Tables
        const gridSections = clone.querySelectorAll('[style*="display: grid"], [style*="display: flex"]');
        gridSections.forEach(section => {
            section.style.display = 'block'; // Fallback for Word
        });

        const sourceHTML = fileHeader + clone.innerHTML + fileFooter;
        const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
        
        saveAs(blob, fileName);
    };

    const renderTrendRow = (label, key, dataArray, isProfit = false) => {
        if (!dataArray || dataArray.length === 0) return null;
        return (
            <tr style={{ backgroundColor: 'transparent' }}>
                <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>{label}</td>
                {dataArray.map((t, i) => (
                    <td key={i} style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'normal' }}>
                        {isProfit ? (t[key] / 1000000).toFixed(1) : (t[key] || 0)}
                    </td>
                ))}
                {dataArray.map((t, i) => {
                    if (i === 0) return null;
                    const current = parseFloat(t[key] || 0);
                    const previous = parseFloat(dataArray[i - 1][key] || 0);
                    const change = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : 0;
                    const isLatest = i === dataArray.length - 1;
                    return (
                        <td key={`pct-${i}`} style={{ 
                            padding: '10px', border: '1px solid #ddd', textAlign: 'center',
                            fontWeight: isLatest ? 'bold' : 'normal',
                            backgroundColor: isLatest ? '#f0f9ff' : 'transparent',
                            color: change >= 0 ? '#16a34a' : '#dc2626'
                        }}>
                            {change > 0 ? '+' : ''}{change.toFixed(0)}%
                        </td>
                    );
                })}
            </tr>
        );
    };

    const renderContent = () => {
        if (loading) return (
            <div className="w-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100">
                <Sparkles className="animate-pulse text-blue-600 mb-4" size={48} />
                <p className="text-lg font-bold text-slate-700 italic">Gathering Monthly Reports...</p>
            </div>
        );

        if (!data) return null;

        const { 
            summary = { financials: {} }, 
            trends = [], 
            managers = [], 
            managerTrends = [],
            prevMonthName = "Prev",
            currMonthName = "Curr",
            brands = [], 
            brandTrends = [], 
            topVolume = [], 
            topProfit = [],
            reportMonth = "Unknown",
            ai_insights = null 
        } = data;

        const monthName = reportMonth.split(' ')[0] || "this period";

        return (
            <div ref={reportRef} className="bg-white w-full max-w-[210mm] sm:p-12 p-6 text-slate-800 shadow-2xl printable-area overflow-hidden">
                
                {/* Header */}
                <div style={{ borderBottom: '5px solid #1e3a8a', paddingBottom: '15px', marginBottom: '25px' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#d30e0e', margin: 0, textTransform: 'uppercase' }}>
                        Monthly Performance Report 
                    </h1>
                    <p style={{ fontSize: '13px', color: '#d30e0e', fontWeight: 'bold', marginTop: '5px' }}>
                        {reportMonth}
                    </p>
                </div>

                {/* EXECUTIVE SUMMARY */}
                <section style={{ marginBottom: '30px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px', marginBottom: '10px' }}>Executive Summary</h3>
                    <p style={{ fontSize: '12px', lineHeight: '1.7', fontWeight:'Bold', textAlign: 'justify', color: '#161e29' }}>
                        {ai_insights?.executive_summary || `This report provides an overview of fleet performance across four Brands — HOWO, IVECO, MAN TGA, and MACK for ${monthName}. It focuses on key metrics such as Trips, revenue, profit and fleet utilization.`}
                    </p>
                </section>

                {/* OVERALL FLEET PERFORMANCE */}
                <section style={{ marginBottom: '35px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '12px', textTransform: 'uppercase' }}>
                        🚚 Overall Fleet Performance - {monthName}
                    </h3>
                    
                    <div className="overflow-x-auto">
                        <table style={{ width: '100%', minWidth: '500px', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '20px', backgroundColor: '#fff' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
                                    <th style={{ padding: '12px 10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Activity Metric</th>
                                    <th style={{ padding: '12px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>Period Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Total Trips By Inhouse</td>
                                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: '900', fontSize: '14px', color: '#1e3a8a' }}>
                                        {summary.total_inhouse_trips || 0}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Trips Growth (MoM)</td>
                                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: (summary.trips_growth_val || 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                                        {(summary.trips_growth_val || 0) > 0 ? '+' : ''}{summary.trips_growth_val || 0} 
                                        <span style={{ color: '#64748b', fontSize: '10px', marginLeft: '4px' }}>({summary.trips_growth_pct || 0}%)</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Active Trucks</td>
                                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: '900', fontSize: '14px', color: '#1e3a8a' }}>
                                        {summary.active_trucks || 0}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bolder' }}>Overall Fleet Utilization</td>
                                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bolder' }}>
                                        {summary.utilization_pct || 0}%
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bolder' }}>Average Trip per Truck (T/T)</td>
                                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bolder' }}>
                                        {summary.avg_tt || 0}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style={{ padding: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', sm: {flexDirection: 'row'}, justifyContent: 'space-between', marginBottom: '15px' }}>
                            <strong style={{ color: '#1e3a8a', fontSize: '13px' }}>Financial Performance Statement</strong>
                        </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
    {/* Gross Profit */}
    <div style={{ padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Gross Profit</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>
            {compactFmt(summary.financials?.gross)}
        </div>
    </div>
    <div style={{ padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Maintenance Spend</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>
            - {compactFmt(summary.financials?.maintenance)}
        </div>
    </div>
    <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 'bold', textTransform: 'uppercase' }}>Net Profit</div>
        <div style={{ fontSize: '22px', fontWeight: '900', color: '#16a34a' }}>
            {compactFmt(summary.financials?.net)}
        </div>
    </div>
                    </div>
                </section>

                {/* TREND ANALYSIS */}
                <section style={{ marginBottom: '40px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '15px' }}>
                        📈 {trends.length}-Month Trend Analysis: Commercial Performance
                    </h3>
                    <div className="overflow-x-auto">
                        <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '20px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9', color: '#1e3a8a' }}>
                                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Performance Metric</th>
                                    {trends.map((t, i) => (
                                        <th key={`head-${i}`} style={{ padding: '10px', border: '1px solid #ddd', backgroundColor: i === trends.length - 1 ? '#eff6ff' : 'transparent' }}>
                                            {t.month_label}
                                        </th>
                                    ))}
                                    {trends.map((t, i) => {
                                        if (i === 0) return null;
                                        const isLatest = i === trends.length - 1;
                                        return (
                                            <th key={`pct-head-${i}`} style={{ padding: '5px', border: '1px solid #ddd', fontSize: '9px', backgroundColor: isLatest ? '#1e3a8a' : '#f8fafc', color: isLatest ? '#fff' : '#1e3a8a' }}>
                                                % Chg ({t.month_label})
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {renderTrendRow("Total Trips", "trips", trends)}
                                {renderTrendRow("Active Trucks", "active_trucks", trends)}
                                {renderTrendRow("T/T Efficiency", "t_t", trends)}
                                {renderTrendRow("Net Profit", "net_profit", trends, true)}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* FLEET MANAGER INSIGHT */}
                <section style={{ margin: '40px 0', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '15px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} /> Fleet Manager Performance
                    </h3>
                    
                    <div className="overflow-x-auto">
                        <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '24px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#1e3a8a', color: '#fff' }}>
                                    <th style={{ padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Manager (Trucks)</th>
                                    <th style={{ padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>Active Trucks</th>
                                    <th style={{ padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>% Utilized</th>
                                    <th style={{ padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>Trips</th>
                                    <th style={{ padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>% Trips</th>
                                    <th style={{ padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>T/T Ratio</th>
                                    <th style={{ padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>Target Hit</th>
                                    <th style={{ padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>Net Profit</th>
                                </tr>
                            </thead>
                          <tbody>
  {managers.map((m, i) => (
    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
      <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', fontWeight: 'bold', color: '#1e293b' }}>
        {m.name || 'Unknown'} ({m.capacity || 0})
      </td>
      <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold' }}>{m.active_trucks || 0}</td>
      <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{m.utilization_pct || 0}%</td>
      <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold' }}>{m.total_trips || 0}</td>
      <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>{m.trip_share || 0}%</td>
      <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: '#1e3a8a', backgroundColor: '#f1f5f9' }}>{m.t_t || 0}</td>
      <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: (m.target_pct || 0) >= 100 ? '#16a34a' : '#ea580c' }}>{m.target_pct || 0}%</td>
      
      {/* UPDATED: Changed formatNairaFull to compactFmt */}
      <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 'bold' }}>
        {compactFmt(m.profit)}
      </td>
    </tr>
  ))}
</tbody>
                        </table>
                    </div>

                  {/* AI MANAGER INSIGHT */}
{ai_insights?.manager_insights && (
    <div className="ai-callout bg-teal-50/50 p-5 rounded-xl border border-teal-100 shadow-sm mt-4">
        <h4 className="font-bold text-teal-900 mb-2 text-xs uppercase tracking-wider flex items-center gap-2" style={{color:"#134e4a", backgroundColor:"transparent", padding:"0"}}>
            <span className="text-base">✨</span>Fleet Manager Performance Insights
        </h4>
        {/* Changed text-lg sm:text-base to text-xs sm:text-sm */}
        <p className="text-[6px] sm:text-sm leading-tight text-slate-600 text-justify m-0" style={{ fontSize: '11px', color: 'black', fontWeight: 'bold'}}>
            {ai_insights.manager_insights}
        </p>
    </div>
)}
                </section>

                {/* BRAND PERFORMANCE BREAKDOWN */}
                <section style={{ marginBottom: '40px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '15px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        🚚 Brand Performance
                    </h3>
                    <div className="overflow-x-auto">
                        <table style={{ width: '100%', minWidth: '500px', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '25px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#1e3a8a', color: '#fff' }}>
                                    <th style={{ padding: '12px 10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Brand (Total)</th>
                                    <th style={{ padding: '12px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>Active Trucks</th>
                                    <th style={{ padding: '12px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>% Utilized</th>
                                    <th style={{ padding: '12px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>Total Trips</th>
                                    <th style={{ padding: '12px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>% Trips</th>
                                    <th style={{ padding: '12px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>T/T Ratio</th>
                                </tr>
                            </thead>
                            <tbody>
                                {brands.map((b, i) => (
                                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                        <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>{b.name} ({b.capacity})</td>
                                        <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{b.active_trucks}</td>
                                        <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{b.utilization_pct}%</td>
                                        <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold' }}>{b.total_trips}</td>
                                        <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{b.trip_share}%</td>
                                        <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: '#1e3a8a' }}>{b.t_t}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* AI BRAND ANALYSIS */}
                    {ai_insights?.brand_insights && (
                        <div className="ai-callout bg-teal-50/50 p-5 rounded-xl border border-teal-100 shadow-sm mt-4">
                            <h4 className="font-bold text-teal-900 mb-2 text-sm uppercase tracking-wider flex items-center gap-2" style={{color:"#134e4a", backgroundColor:"transparent", padding:"0"}}>
                                <span className="text-lg">✨</span> Brand Performance Insights
                            </h4>
                                 <p className="text-xs sm:text-sm leading-relaxed text-slate-700 text-justify m-0"  style={{ fontSize: '11px', color: 'black', fontWeight: 'bold'}}>
                                {ai_insights.brand_insights}
                            </p>
                        </div>
                    )}
                </section>

                {/* MANAGER MoM TRENDS */}
                <section style={{ marginBottom: '40px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '15px', textTransform: 'uppercase' }}>
                        📈 Fleet Managers MoM Trend ({prevMonthName} vs {currMonthName})
                    </h3>
                    <div className="overflow-x-auto">
                        <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '25px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#475569', color: '#fff' }}>
                                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Fleet Manager (Total)</th>
                                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Trips (Curr)</th>
                                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Trips (Prev)</th>
                                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#334155' }}>% Chg</th>
                                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>T/T (Curr / Prev)</th>
                                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Net Profit (Curr)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {managerTrends.map((mt, idx) => {
                                    const isNegative = mt.change.includes('-');
                                    const isPositive = mt.change.includes('+');
                                    return (
                                        <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                            <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>{mt.manager} ({mt.capacity})</td>
                                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>{mt.currentMonthDisplay}</td>
                                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', color: '#64748b' }}>{mt.lastMonthDisplay}</td>
                                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: isNegative ? '#dc2626' : isPositive ? '#16a34a' : '#64748b' }}>{mt.change}</td>
                                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                                                <span style={{ fontWeight: 'bold', color: '#1e3a8a' }}>{mt.t_t}</span> / <span style={{ color: '#94a3b8' }}>{mt.prev_t_t}</span>
                                            </td>
                                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#16a34a' }}>{formatNaira(mt.profit)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* TOP PERFORMERS SECTION */}
                <section style={{ marginBottom: '40px', pageBreakBefore: 'always' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '25px' }}>
                        
                        {/* TOP VOLUME */}
                        <div className="overflow-x-auto">
                            <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a', marginBottom: '10px', textTransform: 'uppercase' }}>🏅 Top 5 Trucks (Trips)</h3>
                            <table style={{ width: '100%', minWidth: '300px', borderCollapse: 'collapse', fontSize: '9px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#16a34a', color: '#fff' }}>
                                        <th style={{ padding: '6px', border: '1px solid #ddd' }}>Truck</th>
                                        <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>Brand</th>
                                        <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>Trips</th>
                                        <th style={{ padding: '6px', border: '1px solid #ddd' }}>Manager</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topVolume.slice(0, 5).map((t, i) => (
                                        <tr key={i}>
                                            <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold' }}>{t.truck_number}</td>
                                            <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>{t.brand}</td>
                                            <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', textAlign: 'center', color: '#1d4ed8' }}>{t.trips}</td>
                                            <td style={{ padding: '6px', border: '1px solid #ddd' }}>{t.fm}</td>
                                        </tr>
                                    ))}
                                    {topVolume.length === 0 && <tr><td colSpan="4" style={{ padding: '10px', textAlign: 'center' }}>No data available</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* TOP PROFIT */}
                        <div className="overflow-x-auto">
                            <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '10px', textTransform: 'uppercase' }}>💰 Top 5 Truck Profit Makers</h3>
                            <table style={{ width: '100%', minWidth: '300px', borderCollapse: 'collapse', fontSize: '9px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#1e3a8a', color: '#fff' }}>
                                        <th style={{ padding: '6px', border: '1px solid #ddd' }}>Truck</th>
                                        <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>Trips</th>
                                        <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>Net Profit</th>
                                        <th style={{ padding: '6px', border: '1px solid #ddd' }}>Manager</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topProfit.slice(0, 5).map((t, i) => (
                                        <tr key={i}>
                                            <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold' }}>{t.truck_number}</td>
                                            <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', textAlign: 'center' }}>{t.trips}</td>
                                            <td style={{ padding: '6px', border: '1px solid #ddd', color: '#1e3a8a', fontWeight: 'bold', textAlign: 'right' }}>{formatNairaFull(t.net_profit)}</td>
                                            <td style={{ padding: '6px', border: '1px solid #ddd' }}>{t.fm}</td>
                                        </tr>
                                    ))}
                                    {topProfit.length === 0 && <tr><td colSpan="4" style={{ padding: '10px', textAlign: 'center' }}>No data available</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* AI TOP PERFORMER INSIGHT */}
                    {ai_insights?.top_performer_insights && (
                        <div className="ai-callout bg-teal-50/50 p-5 rounded-xl border border-teal-100 shadow-sm mt-4">
                            <h4 className="font-bold text-teal-900 mb-2 text-sm uppercase tracking-wider flex items-center gap-2" style={{color:"#134e4a", backgroundColor:"transparent", padding:"0"}}>
                                <span className="text-lg">✨</span> Trucks Performance Insights
                            </h4>
                           <p className="text-xs sm:text-sm leading-relaxed text-slate-700 text-justify m-0"  style={{ fontSize: '11px', color: 'black', fontWeight: 'bold'}}>
                            {ai_insights.top_performer_insights}
                            </p>
                        </div>
                    )}
                </section>

            </div>
        );
    };

    return (
        <div className="bg-slate-100 min-h-screen p-4 sm:p-10 font-sans text-slate-800 tracking-wide">
            <div className="max-w-[1100px] mx-auto space-y-6">
                
                {/* Top Control Bar */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 no-print flex flex-col md:flex-row justify-between gap-4 items-center">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                        <Link to="/" className="text-slate-500 font-bold flex items-center gap-2 transition-colors hover:text-blue-600 text-sm sm:text-base mr-4">
                            <ArrowLeft size={18}/> BACK 
                        </Link>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Month</span>
                            <input 
                                type="month" 
                                value={selectedMonth} 
                                onChange={(e) => setSelectedMonth(e.target.value)} 
                                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none font-bold" 
                            />
                        </div>
                    </div>

                    {data && (
                        <div className="flex w-full md:w-auto gap-3">
                            <button onClick={downloadWord} className="flex-1 md:flex-none justify-center bg-blue-100 text-blue-800 px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:bg-blue-200 transition-all flex items-center gap-2">
                                <FileText size={16}/> Download as Document
                            </button>
                            <button onClick={downloadPDF} className="flex-1 md:flex-none justify-center bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg hover:bg-red-700 transition-all flex items-center gap-2">
                                <Download size={16}/> Download as PDF
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex justify-center">{renderContent()}</div>
            </div>
        </div>
    );
};

export default MonthlyReportDashboard;