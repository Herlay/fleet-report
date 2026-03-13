import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { 
    ArrowLeft, Download, FileText, Calendar, Sparkles, 
    Activity, Users, Target, Zap, TrendingUp 
} from 'lucide-react';

const isProduction = import.meta.env.PROD; 

const api = axios.create({
    baseURL: isProduction ? import.meta.env.VITE_API_URL : 'http://localhost:5000', 
    headers: { 'Content-Type': 'application/json' },
});

const formatNaira = (num) => `₦${((num || 0) / 1000000).toFixed(1)}M`;
const formatNairaFull = (num) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(num || 0);
const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const compactFmt = (v) => {
  const val = Number(v || 0);
  if (Math.abs(val) >= 1000000) {
    return `₦${(val / 1000000).toFixed(1)}M`;
  } else if (Math.abs(val) >= 1000) {
    return `₦${(val / 1000).toFixed(0)}K`;
  }
  return `₦${val.toFixed(0)}`;
};
const CustomReportPage = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const reportRef = useRef();

    const fetchReport = async () => {
        if (!startDate || !endDate) {
            alert("Please select both a Start Date and an End Date.");
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            alert("Start Date cannot be after End Date.");
            return;
        }

        setLoading(true);
        try {
            const response = await api.get('/api/analytics/custom-report', {
                params: { startDate, endDate }
            });
            setData(response.data);
        } catch (err) {
            console.error("Failed to fetch custom report:", err);
            alert("Failed to fetch report data. Please check console.");
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
        
        pdf.save(`Custom_Fleet_Report_${startDate}_to_${endDate}.pdf`);
    };

    // --- WORD EXPORT ---
    const downloadWord = () => {
        if (!reportRef.current) return;

        const fileName = `Custom_Fleet_Report_${startDate}_to_${endDate}.doc`;

        const fileHeader = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' 
                  xmlns:w='urn:schemas-microsoft-com:office:word' 
                  xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
              <meta charset='utf-8'>
              <style>
                @page Section1 {
                  size: 595.3pt 841.9pt; 
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

        const clone = reportRef.current.cloneNode(true);
        
        const elementsToRemove = clone.querySelectorAll('.no-print, canvas, svg, button');
        elementsToRemove.forEach(el => el.remove());

        const gridSections = clone.querySelectorAll('[style*="display: grid"], [style*="display: flex"]');
        gridSections.forEach(section => {
            section.style.display = 'block'; 
        });

        const sourceHTML = fileHeader + clone.innerHTML + fileFooter;
        const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
        
        saveAs(blob, fileName);
    };

    const renderContent = () => {
        if (loading) return (
            <div className="w-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100">
                <Sparkles className="animate-pulse text-blue-600 mb-4" size={48} />
                <p className="text-lg font-bold text-slate-700 italic">Analyzing Custom Date Range...</p>
            </div>
        );

        if (!data) return (
            <div className="w-full p-10 sm:p-20 text-center text-slate-400 border-2 border-dashed rounded-xl bg-white/50">
                <Calendar className="mx-auto mb-4 opacity-20" size={64} />
                <p className="text-lg sm:text-xl font-medium">Select a Start and End date above to generate a custom report.</p>
            </div>
        );

        const { 
            summary = { financials: {} }, 
            managers = [], 
            brands = [], 
            topVolume = [], 
            topProfit = [],
            ai_insights = null 
        } = data;

        return (
            <div ref={reportRef} className="bg-white w-full max-w-[210mm] sm:p-12 p-6 text-slate-800 shadow-2xl printable-area overflow-hidden">
                
                {/* Header */}
                <div style={{ borderBottom: '5px solid #095e09', paddingBottom: '15px', marginBottom: '25px' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#095e09', margin: 0, textTransform: 'uppercase' }}>
                        Custom Performance Report
                    </h1>
                    <p style={{ fontSize: '13px', color: '#000408', fontWeight: 'bold', marginTop: '5px' }}>
                        {formatDate(startDate)} — {formatDate(endDate)}
                    </p>
                </div>

                {/* EXECUTIVE SUMMARY */}
                <section style={{ marginBottom: '30px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px', marginBottom: '10px' }}>Executive Summary</h3>
                    <p style={{ fontSize: '12px', lineHeight: '1.7', textAlign: 'justify', fontWeight:'bold', color: '#090e16' }}>
                        {ai_insights?.executive_summary || "This report provides an overview of fleet performance for the selected custom date range, focusing on absolute metrics without historical trend comparisons."}
                    </p>
                </section>

                {/* OVERALL FLEET PERFORMANCE */}
                <section style={{ marginBottom: '35px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '12px', textTransform: 'uppercase' }}>
                        🚚 Aggregate Fleet Performance
                    </h3>
                    
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', minWidth: '500px', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '20px', backgroundColor: '#fff' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
                                    <th style={{ padding: '12px 10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Activity Metric</th>
                                    <th style={{ padding: '12px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>Period Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Total Trips Volume</td>
                                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: '900', fontSize: '14px', color: '#1e3a8a' }}>
                                        {summary.total_inhouse_trips || 0}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Unique Active Trucks</td>
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
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', marginBottom: '15px' }}>
        <strong style={{ color: '#1e3a8a', fontSize: '13px' }}>Period Financial Performance Statement</strong>
    </div>
    
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
        {/* Gross Profit */}
        <div style={{ padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Gross Revenue/Profit</div>
            {/* UPDATED: Using compactFmt */}
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>
                {compactFmt(summary.financials?.gross)}
            </div>
        </div>

        {/* Maintenance */}
        <div style={{ padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Maintenance Spend</div>
            {/* UPDATED: Using compactFmt */}
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>
                - {compactFmt(summary.financials?.maintenance)}
            </div>
        </div>

        {/* Net Profit */}
        <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 'bold', textTransform: 'uppercase' }}>Net Profit</div>
            {/* UPDATED: Using compactFmt */}
            <div style={{ fontSize: '22px', fontWeight: '900', color: '#16a34a' }}>
                {compactFmt(summary.financials?.net)}
            </div>
        </div>
    </div>
</div>
                </section>

                {/* FLEET MANAGER INSIGHT */}
                <section style={{ margin: '40px 0', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '15px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} /> Fleet Manager Performance
                    </h3>
                    
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '24px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#1e3a8a', color: '#fff' }}>
                                    <th style={{ padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Fleet Managers (Total)</th>
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
  {managers.map((m, i) => (
    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
      <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', fontWeight: 'bold', color: '#1e293b' }}>
        {m.name || 'Unknown'} ({m.capacity || 0})
      </td>
      <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold' }}>
        {m.active_trucks || 0}
      </td>
      <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{m.utilization_pct || 0}%</td>
      <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold' }}>{m.total_trips || 0}</td>
      <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>{m.trip_share || 0}%</td>
      <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: '#1e3a8a', backgroundColor: '#f1f5f9' }}>{m.t_t || 0}</td>
      
      {/* UPDATED: Total Net Profit (Compact) */}
      <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 'bold' }}>
        {compactFmt(m.profit)}
      </td>
      
      {/* UPDATED: Avg Profit (Compact) */}
      <td style={{ padding: '10px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '500' }}>
        {compactFmt(m.avg_profit)}
      </td>
    </tr>
  ))}
</tbody>
                        </table>
                    </div>

                    {/* AI MANAGER INSIGHT */}
                    {ai_insights?.manager_insights && (
                        <div style={{ padding: '20px', backgroundColor: '#eff6ff', borderLeft: '5px solid #1e3a8a', borderRadius: '4px' }}>
                            <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '10px', textTransform: 'uppercase' }}>
                               Fleet Manager Perfromance Analysis
                            </h4>
                            <p style={{ fontSize: '11.5px', color: '#1e293b', lineHeight: '1.6', textAlign: 'justify', margin: 0 }}>
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
                    <div style={{ overflowX: 'auto' }}>
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
                        <div style={{ padding: '20px', backgroundColor: '#f0fdf4', borderLeft: '5px solid #16a34a', borderRadius: '4px' }}>
                            <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a', marginBottom: '10px', textTransform: 'uppercase' }}>
                               Brand Performance Analysis
                            </h4>
                            <p style={{ fontSize: '11.5px', color: '#1e293b', lineHeight: '1.6', textAlign: 'justify', margin: 0 }}>
                                {ai_insights.brand_insights}
                            </p>
                        </div>
                    )}
                </section>

                {/* TOP PERFORMERS SECTION */}
                <section style={{ marginBottom: '40px', pageBreakBefore: 'always' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '25px' }}>
                        
                        {/* TOP VOLUME */}
                        <div style={{ overflowX: 'auto' }}>
                            <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a', marginBottom: '10px', textTransform: 'uppercase' }}>🏅 Top 5 Volume (Trips)</h3>
                            <table style={{ width: '100%', minWidth: '300px', borderCollapse: 'collapse', fontSize: '9px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#16a34a', color: '#fff' }}>
                                        <th style={{ padding: '6px', border: '1px solid #ddd' }}>Truck</th>
                                        <th style={{ padding: '6px', border: '1px solid #ddd' }}>Brand</th>
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
                        <div style={{ overflowX: 'auto' }}>
                            <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '10px', textTransform: 'uppercase' }}>💰 Top 5 Profit Makers</h3>
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
                        <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#fffbeb', borderRadius: '8px', fontSize: '11px', fontStyle: 'italic', border: '1px solid #fef3c7', textAlign: 'justify' }}>
                            <TrendingUp size={14} className="inline mr-2 text-amber-600"/>
                            <strong style={{ color: '#d97706' }}>Trucks Performance Insight:</strong> {ai_insights.top_performer_insights}
                        </div>
                    )}
                </section>

            </div>
        );
    };

    return (
        <div className="bg-slate-100 min-h-screen p-4 sm:p-10 font-sans">
            <div className="max-w-[1100px] mx-auto space-y-6">
                
                {/* Top Control Bar */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 no-print flex flex-col md:flex-row justify-between gap-4 items-center">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start</span>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)} 
                                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none" 
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">End</span>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => setEndDate(e.target.value)} 
                                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none" 
                            />
                        </div>
                        <button 
                            onClick={fetchReport} 
                            disabled={loading}
                            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold text-sm shadow hover:bg-blue-700 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Loading...' : 'Generate Report for the Range'}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
                    <Link to="/" className="text-slate-500 font-bold flex items-center gap-2 transition-colors hover:text-blue-600 text-sm sm:text-base">
                        <ArrowLeft size={18}/> BACK TO DASHBOARD
                    </Link>
                    
                    {data && (
                        <div className="flex w-full sm:w-auto gap-3">
                            <button onClick={downloadPDF} className="flex-1 sm:flex-none justify-center bg-red-600 text-white px-5 sm:px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg hover:bg-red-700 transition-all flex items-center gap-2">
                                <Download size={16}/> Download as PDF
                            </button>
                            <button onClick={downloadWord} className="flex-1 sm:flex-none justify-center bg-blue-700 text-white px-5 sm:px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg hover:bg-blue-800 transition-all flex items-center gap-2">
                                <FileText size={16}/> Download as WORD
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex justify-center">{renderContent()}</div>
            </div>
        </div>
    );
};

export default CustomReportPage;