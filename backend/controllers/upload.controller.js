import axios from 'axios';
import { processExcelFile } from '../services/excel.service.js';


export const uploadTripData = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: "No file uploaded. Please select an Excel file." 
            });
        }

        console.log(`Processing file: ${req.file.originalname} (${req.file.size} bytes)`);

        // Call the service to parse and insert data
        const result = await processExcelFile(req.file.buffer);

        return res.status(200).json({
            success: true,
            message: "File processed successfully",
            data: {
                insertedRows: result.count
            }
        });

    } catch (error) {
        console.error("Upload Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to process file",
            error: error.message
        });
    }
};

export const handleGoogleSheet = async (req, res) => {
    try {
        const { url } = req.body;

        if (!url || !url.includes('docs.google.com/spreadsheets')) {
            return res.status(400).json({ error: "Invalid Google Sheets URL" });
        }

        // Convert URL to a direct XLSX download link
        const downloadUrl = url.replace(/\/edit.*$/, '/export?format=xlsx');

        console.log("Downloading from Google:", downloadUrl);

        // Fetch the file from Google
        const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
        
        const result = await processExcelFile(response.data);

        return res.status(200).json({
            success: true,
            message: "Google Sheet synced successfully",
            data: {
                insertedRows: result.count 
            }
        });

    } catch (error) {
        console.error("Google Sync Error:", error);
        
        // Axios permission
        const status = error.response ? error.response.status : 500;
        const errorMessage = status === 404 || status === 403 
            ? "Access Denied. Please ensure the Google Sheet is shared as 'Anyone with the link can view'."
            : error.message;

        return res.status(status).json({ 
            success: false,
            error: errorMessage 
        });
    }
};