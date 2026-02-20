import axios from 'axios';

const isProduction = import.meta.env.PROD; 

const api = axios.create({
    // If production, use the live URL, otherwise use localhost
    baseURL: isProduction 
        ? import.meta.env.VITE_API_URL  
        : 'http://localhost:5000/api', 
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

/**
 * AI REPORTING SERVICE
 * Updated to send absoluteWeek for continuity logic
 */
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

export default api;