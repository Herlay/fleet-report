import React, { useState, useEffect } from 'react';
import { getCurrentCapacities, updateFleetCapacity } from '../services/api';

const CapacityManager = () => {
    const [capacities, setCapacities] = useState([]);
    const [formData, setFormData] = useState({
        effectiveDate: new Date().toISOString().split('T')[0], 
        type: 'MANAGER',
        name: '',
        newCapacity: ''
    });
    const [status, setStatus] = useState({ message: '', isError: false });
    const [isLoading, setIsLoading] = useState(false);

    // Fetch current numbers on load
    const fetchCapacities = async () => {
        try {
            const result = await getCurrentCapacities(); 
            if (result && result.success) {
                setCapacities(result.data);
            }
        } catch (error) {
            console.error("Failed to load capacities", error);
        }
    };

    useEffect(() => { fetchCapacities(); }, []);

    // Handle Form Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus({ message: '', isError: false });

        const payload = {
            effectiveDate: formData.effectiveDate,
            type: formData.type,
            name: formData.type === 'TOTAL' ? 'ALL' : formData.name.toUpperCase().trim(),
            newCapacity: Number(formData.newCapacity)
        };

        try {
            const result = await updateFleetCapacity(payload);

            if (result && result.success) {
                setStatus({ message: 'Success! Fleet allocation updated.', isError: false });
                setFormData({ ...formData, name: '', newCapacity: '' }); 
                fetchCapacities(); 
            } else {
                setStatus({ message: result?.error || 'Failed to update.', isError: true });
            }
        } catch (error) {
            setStatus({ message: 'Network error. Please try again.', isError: true });
        } finally {
            setIsLoading(false);
        }
    };

    // Dynamic UI Labels
    const getNameLabel = () => {
        if (formData.type === 'MANAGER') return "Manager Name (New or Existing)";
        if (formData.type === 'BRAND') return "Brand Name (e.g., HOWO)";
        return "Name";
    };

    const getCapacityLabel = () => {
        if (formData.type === 'MANAGER') return "Trucks Assigned";
        if (formData.type === 'BRAND') return "Total Brand Capacity";
        return "Total Fleet Size";
    };

    return (
        <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-7xl mx-auto">
                
                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Fleet Capacity</h2>
                    <p className="mt-2 text-sm text-gray-500 max-w-2xl">
                       Set and manage the maximum number of active trucks assigned to fleet managers and vehicle brands. 
                       <br/>
                       These limits are used to compute real-time utilization.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* --- LEFT: ADD/UPDATE FORM (Spans 5 cols on large screens) --- */}
                    <div className="lg:col-span-5">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
                            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Change Fleet Capacity</h3>
                                    <p className="text-xs text-gray-500">Add a new record or update an existing one.</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Effective Date</label>
                                    <input type="date" required 
                                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3 transition-all outline-none" 
                                        value={formData.effectiveDate} 
                                        onChange={e => setFormData({...formData, effectiveDate: e.target.value})} 
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                                    <select 
                                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3 transition-all outline-none cursor-pointer" 
                                        value={formData.type} 
                                        onChange={e => setFormData({...formData, type: e.target.value, name: e.target.value === 'TOTAL' ? 'ALL' : ''})}
                                    >
                                        <option value="MANAGER">Fleet Manager Capacity</option>
                                        <option value="BRAND">Truck Brand Capacity</option>
                                        <option value="TOTAL">Total Fleet Size</option>
                                    </select>
                                </div>

                                {/* Dynamic Name Input */}
                                {formData.type !== 'TOTAL' && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">{getNameLabel()}</label>
                                        <input type="text" required 
                                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3 uppercase transition-all outline-none" 
                                            placeholder={formData.type === 'MANAGER' ? "e.g. DAVID" : "e.g. HOWO"}
                                            value={formData.name} 
                                            onChange={e => setFormData({...formData, name: e.target.value})} 
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{getCapacityLabel()}</label>
                                    <input type="number" required min="0" 
                                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3 transition-all outline-none" 
                                        placeholder="e.g. 30"
                                        value={formData.newCapacity} 
                                        onChange={e => setFormData({...formData, newCapacity: e.target.value})} 
                                    />
                                </div>

                                <button type="submit" disabled={isLoading} 
                                    className="w-full flex items-center justify-center gap-2 text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-blue-300 font-bold rounded-xl text-sm px-5 py-3.5 transition-all mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Saving...' : 'Save Changes'}
                                </button>

                                {/* Status Messages */}
                                {status.message && (
                                    <div className={`mt-4 p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${status.isError ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        {status.message}
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>

                    {/* --- RIGHT: CURRENT LIST (Spans 7 cols) --- */}
                    <div className="lg:col-span-7 space-y-6">
                        
                        {/* TOTAL FLEET CARD */}
                        {(() => {
                            const totalCap = capacities.find(c => c.entity_type === 'TOTAL');
                            return totalCap ? (
                                <div className="bg-gray-900 rounded-2xl shadow-sm p-6 sm:px-8 text-white flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/10 rounded-xl">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        </div>
                                        <div className="flex flex-col gap-1">
    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Total Fleet Size</h4>
    <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            {totalCap.capacity}
        </span>
        <span className="text-sm font-bold text-white-500 uppercase tracking-wide">Trucks</span>
    </div>
</div>
                                    </div>
                                </div>
                            ) : null;
                        })()}

                        {/* MANAGERS & BRANDS CARDS */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {['MANAGER', 'BRAND'].map(type => {
                                const filteredCaps = capacities.filter(c => c.entity_type === type);
                                if (filteredCaps.length === 0) return null;

                                const isManager = type === 'MANAGER';

                                return (
                                    <div key={type} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                            <h4 className="font-bold text-black-800 flex items-center gap-2">
                                                {isManager ? (
                                                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
                                                ) : (
                                                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>
                                                )}
                                                {isManager ? 'Fleet Managers' : 'Truck Brands'}
                                            </h4>
                                        </div>
                                        <div className="p-4">
                                            <ul className="space-y-2">
                                                {filteredCaps.map((cap, i) => (
                                                    <li key={i} className="flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                                        <span className="text-gray-700 font-semibold">{cap.entity_name}</span>
                                                        <span className="bg-blue-50 text-blue-700 py-1 px-3 rounded-lg font-bold text-sm border border-blue-100">
                                                            {cap.capacity}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default CapacityManager;