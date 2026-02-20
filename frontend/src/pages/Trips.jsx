import React, { useEffect, useState } from 'react';
import { Search, Loader2, ChevronLeft, ChevronRight, FileSpreadsheet, MapPin, User, Truck } from 'lucide-react';
import { getAllTrips } from '../services/api';

const Trips = () => {
    const [trips, setTrips] = useState([]);
    const [filteredTrips, setFilteredTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage] = useState(15);

    useEffect(() => {
        const fetchTrips = async () => {
            try {
                setLoading(true);
                const data = await getAllTrips();
                const sanitizedData = Array.isArray(data) ? data : [];
                setTrips(sanitizedData);
                setFilteredTrips(sanitizedData);
            } catch (error) {
                console.error("Error loading trips:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTrips();
    }, []);

    useEffect(() => {
        const results = trips.filter(t => 
            t.truck_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.trip_id?.toString().includes(searchTerm) ||
            t.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.fleet_manager?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredTrips(results);
        setCurrentPage(1); 
    }, [searchTerm, trips]);

    // CSV Export Function
  const exportToCSV = () => {
    const headers = [
        "SN", "Trip Date", "Trip ID", "Truck Number", "Brand", "Driver Name", 
        "Client", "Cargo", "Origin", "Destination", "Category", 
        "Fuel Cost", "Maintenance", "Profit", "Fleet Manager"
    ];
    const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        let result = val.toString();
    
        if (result.includes(',') || result.includes('\n') || result.includes('"')) {
            result = `"${result.replace(/"/g, '""')}"`; 
        }
        return result;
    };

    const rows = filteredTrips.map(t => [
        escapeCSV(t.sn),
        escapeCSV(new Date(t.trip_date).toLocaleDateString()),
        escapeCSV(t.trip_id),
        escapeCSV(t.truck_number),
        escapeCSV(t.brand),
        escapeCSV(t.driver_name),
        escapeCSV(t.client),
        escapeCSV(t.cargo_description),
        escapeCSV(t.origin),
        escapeCSV(t.destination),
        escapeCSV(t.trip_category),
        t.fuel_cost || 0,
        t.maintenance || 0,
        t.profit || 0,
        escapeCSV(t.fleet_manager)
    ]);


    const csvContent = [
        headers.join(","), 
        ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Fleet_Master_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

    // Pagination Logic
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = filteredTrips.slice(indexOfFirstRow, indexOfLastRow);
    const totalPages = Math.ceil(filteredTrips.length / rowsPerPage);

    const fmt = (val) => isNaN(val) ? "₦0" : `₦${parseInt(val).toLocaleString()}`;

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh', gap: '10px' }}>
            <Loader2 className="animate-spin" size={40} color="#1e3a8a" />
            <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Accessing Database For Trips...</p>
        </div>
    );

    return (
        <div style={{ padding: '30px', backgroundColor: '#f4f7fa', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
            
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '25px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e3a8a', margin: 0, letterSpacing: '-0.5px' }}>All Trips</h2>
                    <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>Detailed historical record of all trips operations.</p>
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                        <input 
                            type="text" 
                            placeholder="Search records..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '10px 15px 10px 40px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', width: '280px', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                        />
                    </div>
                    <button 
                        onClick={exportToCSV}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', backgroundColor: '#1e3a8a', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#fff', boxShadow: '0 4px 6px rgba(30, 58, 138, 0.2)' }}
                    >
                        <FileSpreadsheet size={16} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 25px rgba(0,0,0,0.06)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b' }}>
                                <th style={{ padding: '15px 20px' }}>SN</th>
                                <th style={{ padding: '15px' }}>TRIP DATE</th>
                                <th style={{ padding: '15px' }}>TRIP ID</th>
                                <th style={{ padding: '15px' }}>TRUCK & BRAND</th>
                                <th style={{ padding: '15px' }}>DRIVER</th>
                                <th style={{ padding: '15px' }}>CLIENT & CARGO</th>
                                <th style={{ padding: '15px' }}>ROUTE</th>
                                <th style={{ padding: '15px' }}>CATEGORY</th>
                                <th style={{ padding: '15px', textAlign: 'right' }}>FUEL</th>
                                <th style={{ padding: '15px', textAlign: 'right' }}>MAINTENANCE</th>
                                <th style={{ padding: '15px', textAlign: 'right' }}>NET PROFIT</th>
                                <th style={{ padding: '10px 1px' }}>FLEET MANAGER</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentRows.length > 0 ? currentRows.map((t, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f8fafc', transition: '0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fbfcfd'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <td style={{ padding: '15px 20px', color: '#94a3b8' }}>{t.sn || (indexOfFirstRow + i + 1)}</td>
                                    <td style={{ padding: '15px', fontWeight: '500', color: '#334155' }}>{new Date(t.trip_date).toLocaleDateString()}</td>
                                    <td style={{ padding: '15px', fontWeight: '700', color: '#1e3a8a' }}>{t.trip_id}</td>
                                    <td style={{ padding: '15px' }}>
                                        <div style={{ fontWeight: '800', color: '#1e293b' }}>{t.truck_number}</div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>{t.brand}</div>
                                    </td>
                                    <td style={{ padding: '15px', textTransform: 'uppercase', fontSize: '11px', fontWeight: '500' }}>{t.driver_name}</td>
                                    <td style={{ padding: '15px' }}>
                                        <div style={{ fontWeight: '600', color: '#475569' }}>{t.client}</div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.cargo_description}</div>
                                    </td>
                                    <td style={{ padding: '15px', color: '#64748b' }}>
                                        <span style={{fontWeight: '600'}}>{t.origin}</span> → <span style={{fontWeight: '600'}}>{t.destination}</span>
                                    </td>
                                    <td style={{ padding: '15px' }}>
                                        <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', border: '1px solid', backgroundColor: t.trip_category === 'NON - IT' ? '#dcfce7' : '#eff6ff', color: t.trip_category === 'NON - IT' ? '#166534' : '#1e40af', borderColor: t.trip_category === 'NON - IT' ? '#bbf7d0' : '#dbeafe' }}>
                                            {t.trip_category}
                                        </span>
                                    </td>
                                    <td style={{ padding: '15px', textAlign: 'right', fontWeight: '500' }}>{fmt(t.fuel_cost)}</td>
                                    <td style={{ padding: '15px', textAlign: 'right', color: '#dc2626', fontWeight: '500' }}>{fmt(t.maintenance)}</td>
                                    <td style={{ padding: '15px', textAlign: 'right', color: '#16a34a', fontWeight: '900' }}>{fmt(t.profit)}</td>
                                    <td style={{ padding: '15px 20px', color: '#64748b', fontSize: '11px', fontWeight: '500' }}>{t.fleet_manager}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="12" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No trip records found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div style={{ padding: '15px 25px', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                        Showing <span style={{color: '#1e3a8a', fontWeight: '700'}}>{indexOfFirstRow + 1}</span> to <span style={{color: '#1e3a8a', fontWeight: '700'}}>{Math.min(indexOfLastRow, filteredTrips.length)}</span> of {filteredTrips.length} entries
                    </span>
                    
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: currentPage === 1 ? '#f1f5f9' : '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                            <ChevronLeft size={18} color={currentPage === 1 ? '#cbd5e1' : '#475569'} />
                        </button>
                        
                        {/* Dynamic Page Numbers */}
                        {[...Array(totalPages)].map((_, i) => (
                            (i + 1 === 1 || i + 1 === totalPages || (i + 1 >= currentPage - 1 && i + 1 <= currentPage + 1)) && (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    style={{ 
                                        minWidth: '35px', padding: '8px', borderRadius: '8px', border: '1px solid',
                                        borderColor: currentPage === i + 1 ? '#1e3a8a' : '#e2e8f0',
                                        backgroundColor: currentPage === i + 1 ? '#1e3a8a' : '#fff',
                                        color: currentPage === i + 1 ? '#fff' : '#475569',
                                        cursor: 'pointer', fontWeight: '700', fontSize: '12px'
                                    }}
                                >
                                    {i + 1}
                                </button>
                            )
                        ))}

                        <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: currentPage === totalPages ? '#f1f5f9' : '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                            <ChevronRight size={18} color={currentPage === totalPages ? '#cbd5e1' : '#475569'} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Trips;