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
    const [selectedMonth, setSelectedMonth] = useState("2026-03");
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

    // --- PDF EXPORT ---
    const downloadPDF = async () => {
        const element = reportRef.current;
        const originalWidth = element.style.width;
        const originalMaxWidth = element.style.maxWidth;
        const originalMargin = element.style.margin;

        const targetWidth = 1440; 
        element.style.width = `${targetWidth}px`;
        element.style.maxWidth = `${targetWidth}px`;
        element.style.margin = '0'; 

        const canvas = await html2canvas(element, { 
            scale: 2, 
            useCORS: true,
            windowWidth: targetWidth,
            scrollY: -window.scrollY,
            x: 0, 
            y: 0
        });
        
        element.style.width = originalWidth; 
        element.style.maxWidth = originalMaxWidth;
        element.style.margin = originalMargin;

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF('p', 'pt', 'a4'); 
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width; 
        
        let position = 0;
        const pageHeight = pdf.internal.pageSize.getHeight();

        if (pdfHeight > pageHeight) {
            while (position < pdfHeight) {
                pdf.addImage(imgData, 'JPEG', 0, position * -1, pdfWidth, pdfHeight);
                position += pageHeight;
                if (position < pdfHeight) pdf.addPage();
            }
        } else {
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
                @page Section1 { size: 595.3pt 841.9pt; margin: 1.0in 0.75in; }
                div.Section1 { page: Section1; }
                body { font-family: "Calibri", "Segoe UI", sans-serif; font-size: 11pt; }
                table { border-collapse: collapse; width: 100%; border: 1pt solid #e2e8f0; margin-bottom: 15pt; }
                th { background-color: #1e3a8a; color: white; padding: 8pt; border: 1pt solid #ffffff; text-align: left; font-size: 10pt; }
                td { padding: 8pt; border: 1pt solid #e2e8f0; vertical-align: top; font-size: 10pt; }
                h1 { color: #1e3a8a; font-size: 22pt; margin-bottom: 5pt; }
                h3 { color: #1e3a8a; font-size: 14pt; border-bottom: 1.5pt solid #1e3a8a; padding-bottom: 3pt; margin-top: 20pt; text-transform: uppercase; }
                .page-break { page-break-before: always; }
              </style>
            </head>
            <body><div class="Section1">`;

        const fileFooter = "</div></body></html>";
        const clone = reportRef.current.cloneNode(true);
        
        const elementsToRemove = clone.querySelectorAll('.no-print, canvas, svg, button');
        elementsToRemove.forEach(el => el.remove());

        const gridSections = clone.querySelectorAll('[style*="display: grid"], [style*="display: flex"]');
        gridSections.forEach(section => { section.style.display = 'block'; });

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
                <p className="text-lg font-bold text-slate-700 italic">Generating Monthly Reports...</p>
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
            teuDistribution = [], 
            topProfitability = [], 
            redZone = [], 
            topVolume = [], 
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
                                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: (summary.trips_growth_pct || 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                                        {(summary.trips_growth_pct || 0) > 0 ? '▲ +' : ((summary.trips_growth_pct || 0) < 0 ? '▼ ' : '')}{summary.trips_growth_pct || 0}% 
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Active Trucks</td>
                                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: '900', fontSize: '14px', color: '#1e3a8a' }}>
                                        {summary.active_trucks || 0}
                                        
                                        {/* DYNAMIC ARROW LOGIC FOR TRUCK GROWTH */}
                                        {(() => {
                                            const prevActive = trends.length > 1 ? trends[trends.length - 2].active_trucks : (summary.active_trucks || 0);
                                            const diff = (summary.active_trucks || 0) - prevActive;
                                            
                                            if (diff === 0) return <span style={{ fontSize: '11px', marginLeft: '6px', color: '#64748b', fontWeight: 'bold' }}>(-)</span>;
                                            
                                            return (
                                                <span style={{ 
                                                    fontSize: '11px', 
                                                    marginLeft: '6px', 
                                                    color: diff > 0 ? '#16a34a' : '#dc2626',
                                                    fontWeight: 'bold'
                                                }}>
                                                    ({diff > 0 ? '▲ +' : '▼ '}{diff})
                                                </span>
                                            );
                                        })()}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bolder' }}>Overall Fleet Utilization</td>
                                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bolder' }}>
                                        {Math.min(100, summary.utilization_pct || 0)}%
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
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                            <div style={{ padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Gross Profit</div>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>{compactFmt(summary.financials?.gross)}</div>
                            </div>
                            <div style={{ padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Maintenance</div>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>- {compactFmt(summary.financials?.maintenance)}</div>
                            </div>
                            <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 'bold', textTransform: 'uppercase' }}>Net Profit</div>
                                <div style={{ fontSize: '22px', fontWeight: '900', color: '#16a34a' }}>{compactFmt(summary.financials?.net)}</div>
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

                {/* JOB DISTRIBUTION & TEUS */}
                <section style={{ marginBottom: '40px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '10px', textTransform: 'uppercase' }}>
                        📦 Job Distribution 
                    </h3>
                    
                        <h4 style={{ fontSize: '12px', fontWeight: 'bolder', color: '#850d0d', marginBottom: '10px', textTransform: 'uppercase' }}>
                        NUMBER OF TEUS MOVED BY TRUCKS FOR {monthName}
                    </h4>

                    <div className="overflow-x-auto" style={{ marginBottom: '15px' }}>
                        <table style={{ width: '100%', minWidth: '400px', borderCollapse: 'collapse', fontSize: '11px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#1e3a8a', color: '#fff' }}>
                                    <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>SIZE</th>
                                    <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>NO. OF JOBS</th>
                                    <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>NO OF TEUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teuDistribution.map((t, i) => (
                                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                        <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>{t.size}</td>
                                        <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{t.jobs}</td>
                                        <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#1d4ed8', fontWeight: 'bold' }}>{t.teus}</td>
                                    </tr>
                                ))}
                                {teuDistribution.length === 0 && <tr><td colSpan="3" style={{ padding: '10px', textAlign: 'center' }}>No TEU data available</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    <p style={{ fontSize: '12px', color: '#1e293b', lineHeight: '1.6', textAlign: 'justify', fontWeight: '500' }}>
                        {ai_insights?.teu_insights}
                    </p>
                </section>

                {/* FLEET MANAGER INSIGHT (UPGRADED VERSION) */}
                <section style={{ margin: '40px 0', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px 25px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '8px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} /> Fleet Manager Performance
                    </h3>
                    
                    {(() => {
                        const prevTotalActive = trends.length > 1 ? trends[trends.length - 2].active_trucks : (summary.active_trucks || 0);
                        const overallTruckChange = (summary.active_trucks || 0) - prevTotalActive;
                        return (
                            <p style={{ fontSize: '12px', color: '#475569', marginBottom: '16px', fontWeight: '500' }}>
                                Operational Shift: Active commercial fleet 
                                <span style={{ color: overallTruckChange < 0 ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>
                                    {overallTruckChange < 0 ? ` decreased by ${Math.abs(overallTruckChange)}` : ` increased by ${overallTruckChange} units`}
                                </span> compared to previous period.
                            </p>
                        );
                    })()}

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '24px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#1e3a8a', color: '#fff' }}>
                                    <th style={{ padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Fleet Managers</th>
                                    <th style={{ padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>Active Trucks</th>
                                    <th style={{ padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>% Utilized</th>
                                    <th style={{ padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>Trips</th>
                                    <th style={{ padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>% Trips</th>
                                    <th style={{ padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>T/T Ratio</th>
                                    <th style={{ padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>Net Profit</th>
                                    <th style={{ padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>Avg/Unit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {managers.map((m, i) => {
                                    const activeTotal = Number(m.active_trucks || 0); 
                                    const capacity = Number(m.capacity || 1); 
                                    const revenueTrips = Number(m.total_trips || 0);
                                    const profit = Number(m.profit || 0);
                                    const tripShare = m.trip_share || 0;
                                    const calcEfficiency = m.t_t || "0.0";
                                    const avgProfit = m.avg_profit || 0;

                                    // CAPPED AT 100%
                                    const util = Math.min(100, Math.round((activeTotal / capacity) * 100));

                                    // Extract the truck diff specifically for this manager
                                    const mTrend = managerTrends.find(mt => mt.manager.toUpperCase() === (m.name || '').toUpperCase());
                                    let truckDiff = 0;
                                    if (mTrend) {
                                        const currTrucksStr = mTrend.currentMonthDisplay?.match(/\((\d+)\)/)?.[1];
                                        const prevTrucksStr = mTrend.lastMonthDisplay?.match(/\((\d+)\)/)?.[1];
                                        if (currTrucksStr && prevTrucksStr) {
                                            truckDiff = Number(currTrucksStr) - Number(prevTrucksStr);
                                        }
                                    }

                                    return (
                                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                            <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', fontWeight: 'bold', color: '#1e293b' }}>
                                                {m.name || 'Unknown'} ({capacity})
                                            </td>
                                            <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 'bold' }}>{activeTotal}</span>
                                                    {truckDiff !== 0 && (
                                                        <span style={{ fontSize: '8px', color: truckDiff > 0 ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
                                                            {truckDiff > 0 ? '▲' : '▼'} {Math.abs(truckDiff)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                                {util}%
                                            </td>
                                            <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold' }}>
                                                {revenueTrips}
                                            </td>
                                            <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
                                                {tripShare}%
                                            </td>
                                            <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: '#1e3a8a', backgroundColor: '#f1f5f9' }}>
                                                {calcEfficiency}
                                            </td>
                                            <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 'bold' }}>
                                                {compactFmt(profit)}
                                            </td>
                                            <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '500' }}>
                                                {compactFmt(avgProfit)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/*Fleet Manager Performance*/}
                    <div style={{ padding: '20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '12px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Activity size={14} /> Fleet Managers Performance Analysis
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {managers.map((m, i) => {
                                const activeTotal = Number(m.active_trucks || 0);
                                const capacity = Number(m.capacity || 1);
                                const util = Math.min(100, Math.round((activeTotal / capacity) * 100));
                                const revTrips = Number(m.total_trips || 0);
                                const profit = Number(m.profit || 0); 
                                const commercialShare = m.trip_share || 0;
                                const calcEff = m.t_t || "0.0";
                                
                                return (
                                    <div key={i} style={{ fontSize: '11px', color: '#334155', lineHeight: '1.6', paddingLeft: '10px', borderLeft: '3px solid #cbd5e1' }}>
                                        <strong style={{ color: '#1e3a8a', textTransform: 'capitalize' }}>{m.name}:</strong> Managed {activeTotal} active trucks ({util}% util). Contributed <span style={{ fontWeight: 'bold' }}>{revTrips} trips</span> ({commercialShare}% share) generating <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{compactFmt(profit)}</span> with T/T of <span style={{ color: parseFloat(calcEff) >= 10.0 ? '#16a34a' : '#c2410c', fontWeight: 'bold' }}>{calcEff}</span>.
                                    </div>
                                );
                            })}
                        </div>
                    </div>
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
                                {brands.map((b, i) => {
                                    const capacity = Number(b.capacity || 1);
                                    const rawActive = Number(b.active_trucks || 0);
                                    
                                    const activeTotal = Math.min(rawActive, capacity);
                                    const util = Math.round((activeTotal / capacity) * 100);
                                    
                                    const revenueTrips = Number(b.total_trips || 0);
                                    const calcEfficiency = activeTotal > 0 ? (revenueTrips / activeTotal).toFixed(1) : "0.0";

                                    return (
                                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                            <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>{b.name} ({capacity})</td>
                                            <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold' }}>{activeTotal}</td>
                                            <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{util}%</td>
                                            <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold' }}>{revenueTrips}</td>
                                            <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{b.trip_share}%</td>
                                            <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: '#1e3a8a' }}>{calcEfficiency}</td>
                                        </tr>
                                    );
                                })}

                                {/* ARCHITECT FIX: DYNAMIC TOTAL ROW */}
                                {(() => {
                                    if (!brands || brands.length === 0) return null;

                                    const totalBrandCapacity = brands.reduce((sum, b) => sum + Number(b.capacity || 0), 0);
                                    const totalBrandActive = brands.reduce((sum, b) => sum + Math.min(Number(b.active_trucks || 0), Number(b.capacity || 1)), 0);
                                    const totalBrandTrips = brands.reduce((sum, b) => sum + Number(b.total_trips || 0), 0);
                                    const totalBrandShare = brands.reduce((sum, b) => sum + Number(b.trip_share || 0), 0);
                                    
                                    const totalBrandUtil = totalBrandCapacity > 0 ? Math.round((totalBrandActive / totalBrandCapacity) * 100) : 0;
                                    const totalBrandEfficiency = totalBrandActive > 0 ? (totalBrandTrips / totalBrandActive).toFixed(1) : "0.0";

                                    return (
                                        <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #1e3a8a' }}>
                                            <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: '900', color: '#1e3a8a', textTransform: 'uppercase' }}>
                                                TOTAL ({totalBrandCapacity})
                                            </td>
                                            <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: '900', color: '#1e3a8a' }}>
                                                {totalBrandActive}
                                            </td>
                                            <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: '900', color: '#1e3a8a' }}>
                                                {totalBrandUtil}%
                                            </td>
                                            <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: '900', color: '#1e3a8a' }}>
                                                {totalBrandTrips}
                                            </td>
                                            <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: '900', color: '#1e3a8a' }}>
                                                {Math.round(totalBrandShare)}%
                                            </td>
                                            <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: '900', color: '#16a34a' }}>
                                                {totalBrandEfficiency}
                                            </td>
                                        </tr>
                                    );
                                })()}

                            </tbody>
                        </table>
                    </div>
                    
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

{/* BRAND MoM TREND */}
                {brandTrends && brandTrends.length > 0 && (
                    <section style={{ marginBottom: '40px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '15px', textTransform: 'uppercase' }}>
                            📈 Trips MoM Change by Brand
                        </h3>
                        <div className="overflow-x-auto">
                            <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '10px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#475569', color: '#fff' }}>
                                        <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Brand</th>
                                        
                                        {/* Dynamic Month Headers */}
                                        {brandTrends[0].monthlyData.map((md, idx) => (
                                            <th key={`month-head-${idx}`} style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                                                {md.label} Trips / (Trucks)
                                            </th>
                                        ))}
                                        
                                        {/* Dynamic Change Headers */}
                                        {brandTrends[0].monthlyData.map((md, idx) => {
                                            if (idx === 0) return null;
                                            const prevLabel = brandTrends[0].monthlyData[idx - 1].label;
                                            return (
                                                <th key={`change-head-${idx}`} style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#334155' }}>
                                                    % Change ({md.label} vs {prevLabel})
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {brandTrends.map((bt, i) => (
                                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                            <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold', color: '#1e293b' }}>
                                                {bt.brand}
                                            </td>
                                            
                                            {/* Trips / (Trucks) Data */}
                                            {bt.monthlyData.map((md, idx) => (
                                                <td key={`data-${idx}`} style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
                                                    {md.display}
                                                </td>
                                            ))}
                                            
                                            {/* Percentage Changes */}
                                            {bt.changes.map((change, idx) => {
                                                if (idx === 0) return null;
                                                const isNegative = change && change.includes('-');
                                                const isPositive = change && change.includes('+');
                                                return (
                                                    <td key={`change-${idx}`} style={{ 
                                                        padding: '10px', 
                                                        border: '1px solid #ddd', 
                                                        textAlign: 'center', 
                                                        fontWeight: 'bold', 
                                                        color: isNegative ? '#dc2626' : isPositive ? '#16a34a' : '#64748b' 
                                                    }}>
                                                        {change || '0%'}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
               
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
                                        <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>Net Profit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topVolume.slice(0, 5).map((t, i) => {
                                        // ARCHITECT FIX: Smart lookup to find this truck's profit from the other arrays
                                        const profitMatch = topProfitability.find(pt => pt.truck_number === t.truck_number) 
                                                         || redZone.find(rt => rt.truck_number === t.truck_number);
                                        
                                        const netProfit = t.net_profit !== undefined ? t.net_profit : (profitMatch?.net_profit || 0);

                                        return (
                                            <tr key={i}>
                                                <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold' }}>{t.truck_number}</td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>{t.brand}</td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', textAlign: 'center', color: '#1d4ed8' }}>{t.trips}</td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd' }}>{t.fm}</td>
                                                <td style={{ 
                                                    padding: '6px', 
                                                    border: '1px solid #ddd', 
                                                    textAlign: 'right', 
                                                    fontWeight: 'bold', 
                                                    color: netProfit >= 0 ? '#16a34a' : '#dc2626' 
                                                }}>
                                                    {compactFmt(netProfit)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {topVolume.length === 0 && <tr><td colSpan="5" style={{ padding: '10px', textAlign: 'center' }}>No data available</td></tr>}
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
                                    {topProfitability.slice(0, 5).map((t, i) => (
                                        <tr key={i}>
                                            <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold' }}>{t.truck_number}</td>
                                            <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', textAlign: 'center' }}>{t.trips}</td>
                                            <td style={{ padding: '6px', border: '1px solid #ddd', color: '#1e3a8a', fontWeight: 'bold', textAlign: 'right' }}>{compactFmt(t.net_profit)}</td>
                                            <td style={{ padding: '6px', border: '1px solid #ddd' }}>{t.fm}</td>
                                        </tr>
                                    ))}
                                    {topProfitability.length === 0 && <tr><td colSpan="4" style={{ padding: '10px', textAlign: 'center' }}>No data available</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

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

                {/* TRUCK PROFITABILITY (TOP 15) */}
                <section style={{ marginBottom: '40px', pageBreakBefore: 'always' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1a1e4e', marginBottom: '10px', textTransform: 'uppercase' }}>
                        💰 Top 15 Trucks by Net Profit
                    </h3>
                    <div className="overflow-x-auto">
                        <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', fontSize: '9px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#068010', color: '#fff' }}>
                                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Truck No</th>
                                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>IT (₦)</th>
                                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>NON-IT (₦)</th>
                                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Trips</th>
                                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Fleet Manager</th>
                                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Brand</th>
                                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Profit (₦)</th>
                                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Maint (₦)</th>
                                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Net Profit (₦)</th>
                                </tr>
                            </thead>
                          <tbody>
    {topProfitability.slice(0, 15).map((t, i) => {
        // Prepare the values to ensure they are numbers
        const itVal = Number(t.it_profit || 0);
        const nonItVal = Number(t.non_it_profit || 0);
        const grossVal = Number(t.profit || 0);
        const maintVal = Number(t.maint || 0);
        const netVal = Number(t.net_profit || 0);

        return (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td style={{ padding: '8px 4px', border: '1px solid #ddd', fontWeight: 'bold' }}>{t.truck_number}</td>
                
                {/* IT PROFIT - Exact formatting, no rounding */}
                <td style={{ padding: '8px 4px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', color: itVal > 0 ? '#1e293b' : '#94a3b8' }}>
                    {formatNairaFull(itVal)}
                </td>
                
                {/* NON-IT PROFIT - Exact formatting, no rounding */}
                <td style={{ padding: '8px 4px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', color: nonItVal > 0 ? '#1e293b' : '#94a3b8' }}>
                    {formatNairaFull(nonItVal)}
                </td>
                
                <td style={{ padding: '8px 4px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>{t.trips}</td>
                <td style={{ padding: '8px 4px', border: '1px solid #e6d8d8', fontSize: '8px', fontWeight: 'bold' }}>{t.fm}</td>
                <td style={{ padding: '8px 4px', border: '1px solid #ddd' }}>{t.brand}</td>
                
                {/* GROSS PROFIT */}
                <td style={{ padding: '8px 4px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: '500' }}>
                    {formatNairaFull(grossVal)}
                </td>
                
                {/* MAINTENANCE - Show as negative if > 0 */}
                <td style={{ padding: '8px 4px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', color: '#dc2626' }}>
                    {maintVal > 0 ? `-${formatNairaFull(maintVal)}` : '₦0'}
                </td>
                
                {/* NET PROFIT - Highlighted background for the most important column */}
                <td style={{ 
                    padding: '8px 4px', 
                    border: '1px solid #ddd', 
                    textAlign: 'right', 
                    whiteSpace: 'nowrap', 
                    fontWeight: '900', 
                    backgroundColor: i % 2 === 0 ? '#f0f9ff' : '#e0f2fe',
                    color: netVal >= 0 ? '#16a34a' : '#dc2626' 
                }}>
                    {formatNairaFull(netVal)}
                </td>
            </tr>
        );
    })}
    {topProfitability.length === 0 && (
        <tr><td colSpan="9" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No profitability data available</td></tr>
    )}
</tbody>
                        </table>
                    </div>
                </section>

                {/* THE RED ZONE */}
                <section style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#dc2626', marginBottom: '10px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🔴🔴🔴 THE RED ZONE (Negative Profit Trucks)
                    </h3>
                    <div className="overflow-x-auto">
                        <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', fontSize: '9px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#dc2626', color: '#fff' }}>
                                    <th style={{ padding: '8px', border: '1px solid #fca5a5' }}>Truck No</th>
                                    <th style={{ padding: '8px', border: '1px solid #fca5a5', textAlign: 'center' }}>Trips</th>
                                    <th style={{ padding: '8px', border: '1px solid #fca5a5', textAlign: 'right' }}>Profit (₦)</th>
                                    <th style={{ padding: '8px', border: '1px solid #fca5a5', textAlign: 'right' }}>Maint (₦)</th>
                                    <th style={{ padding: '8px', border: '1px solid #fca5a5', textAlign: 'right' }}>Net Profit (₦)</th>
                                    <th style={{ padding: '8px', border: '1px solid #fca5a5' }}>Fleet Managers</th>
                                 </tr>
                            </thead>
                            <tbody>
                                {redZone.map((t, i) => (
                                    <tr key={i} style={{ backgroundColor: '#fef2f2' }}>
                                        <td style={{ padding: '8px', border: '1px solid #fecaca', fontWeight: 'bold' }}>{t.truck_number}</td>
                                        <td style={{ padding: '8px', border: '1px solid #fecaca', textAlign: 'center', fontWeight: 'bold' }}>{t.trips}</td>
                                        <td style={{ padding: '8px', border: '1px solid #fecaca', textAlign: 'right' }}>{formatNairaFull(t.profit)}</td>
                                        <td style={{ padding: '8px', border: '1px solid #fecaca', textAlign: 'right', color: '#dc2626' }}>{formatNairaFull(t.maint)}</td>
                                        <td style={{ padding: '8px', border: '1px solid #fecaca', textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>{formatNairaFull(t.net_profit)}</td>
                                        <td style={{ padding: '8px', border: '1px solid #fecaca', fontWeight: 'bold' }}>{t.fm}</td>
                                    </tr>
                                ))}
                                {redZone.length === 0 && <tr><td colSpan="7" style={{ padding: '10px', textAlign: 'center', backgroundColor: '#fef2f2', color: '#dc2626' }}>No trucks in the red zone!</td></tr>}
                            </tbody>
                        </table>
                    </div>
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