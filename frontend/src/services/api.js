import axios from 'axios';

const isProduction = import.meta.env.PROD; 

const api = axios.create({
    // If production, use the live URL, otherwise use localhost
    baseURL: isProduction 
        ? import.meta.env.VITE_API_URL  
        : 'http://localhost:5000', 
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * FILE UPLOAD SERVICES
 */
export const uploadFile = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/upload/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

export const uploadGoogleSheet = async (sheetUrl) => {
    const response = await api.post('/api/upload/google-sheet', { url: sheetUrl });
    return response.data;
};

/**
 * ANALYTICS & DASHBOARD SERVICES
 */
export const getDashboardData = async (week = '') => {
    try {
        const url = week ? `/analytics/dashboard?week=${week}` : '/api/analytics/dashboard';
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        console.error("Dashboard Fetch Error:", error);
        throw error;
    }
};

export const getTrendsData = async (limit = 8) => {
    try {
        const response = await api.get(`/api/analytics/trends?limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error("Trends Fetch Error:", error);
        throw error;
    }
};

// Analytics Insights for Charts
export const getInsightsData = async (startDate, endDate) => {
    try {
        const params = endDate ? { startDate, endDate } : { week: startDate };
        const response = await api.get('/api/analytics/insights', { params });
        return response.data;
    } catch (error) {
        console.error("Insights Error:", error);
        return { data: [] };
    }
};

// Custom Range Fetching
export const getRangeData = async (startDate, endDate, groupBy = 'day') => {
    try {
        const response = await api.get('/api/analytics/range', {
            params: { startDate, endDate, groupBy }
        });
        return response.data;
    } catch (error) {
        console.error("Range Fetch Error:", error);
        throw error;
    }
};

// AI Report
export const getWeeklyReportAI = async (startDate, endDate, absoluteWeek = null) => {
    try {
        const response = await api.get('/api/analytics/weekly-report-ai', {
            params: { 
                startDate, 
                endDate, 
                absoluteWeek
            } 
        });
        return response.data;
    } catch (error) {
        console.error("AI Report API Error:", error);
        throw error;
    }
};

//Monthly Repory
export const getMonthlyExecutiveReport = async (dateStr) => {
    try {
        // dateStr is "2026-02"
        const [year, month] = dateStr.split('-'); 

        const response = await api.get('/api/analytics/monthly-report', {
            params: { month, year } 
        });
        return response.data;
    } catch (error) {
        console.error("Monthly Report API Error:", error.response?.data?.error || error.message);
        throw error;
    }
};

//Maintenance Report
export const getMaintenanceReportData = async (startDate, endDate) => {
    try {
        const response = await api.get(`/api/analytics/maintenance/report?startDate=${startDate}&endDate=${endDate}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching maintenance report:", error);
        throw error;
    }
};

//All Trips from the db
export const getAllTrips = async () => {
    try {
        const response = await api.get('/api/analytics/trips-all'); 
        return response.data;
    } catch (error) {
        console.error("Fetch Trips Error:", error);
        throw error;
    }
};


/**
 * ==========================================
 * FLEET CAPACITY ADMIN SERVICES
 * ==========================================
 */

// 1. Fetch the currently active limits from the database
export const getCurrentCapacities = async () => {
    try {
        // ADDED /analytics TO THE URL
        const response = await api.get('/api/analytics/capacity/current');
        return response.data;
    } catch (error) {
        console.error("Fetch Capacities Error:", error);
        throw error;
    }
};

// 2. Submit a new limit change to the database
export const updateFleetCapacity = async (capacityData) => {
    try {
        // ADDED /analytics TO THE URL
        const response = await api.post('/api/analytics/capacity/update', capacityData);
        return response.data;
    } catch (error) {
        console.error("Update Capacity Error:", error);
        throw error;
    }
};

export default api;