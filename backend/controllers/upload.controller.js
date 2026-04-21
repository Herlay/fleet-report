import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';
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

        // Call the service to parse and insert data (Passes the RAM buffer)
        const result = await processExcelFile(req.file.buffer);

        return res.status(200).json({
            success: true,
            message: "File processed successfully",
            data: {
                insertedRows: result.count,
                maintenanceRows: result.maintCount
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
    // Generate a temporary file path on the server's hard drive
    const tempFilePath = path.join(os.tmpdir(), `google-sheet-${Date.now()}.xlsx`);

    try {
        const { url } = req.body;

        if (!url || !url.includes('docs.google.com/spreadsheets')) {
            return res.status(400).json({ error: "Invalid Google Sheets URL" });
        }

        // Convert URL to a direct XLSX download link
        const downloadUrl = url.replace(/\/edit.*$/, '/export?format=xlsx');

        console.log("Downloading from Google to Disk:", downloadUrl);

        // --- FIXED: Stream to disk to prevent RAM crash ---
        const response = await axios.get(downloadUrl, { 
            responseType: 'stream', 
            timeout: 60000, 
            headers: {
                // Trick Google into thinking this is a real browser
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });
        
        // Pipe the download stream directly into a file
        const writer = fs.createWriteStream(tempFilePath);
        response.data.pipe(writer);

        // Wait for the file to finish downloading and saving to disk
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        console.log("File saved to temporary storage. Processing tabs...");

        // Pass the file path (string) to the service instead of a memory buffer
        const result = await processExcelFile(tempFilePath);

        // Clean up: Delete the temporary file from the server
        fs.unlinkSync(tempFilePath);

        return res.status(200).json({
            success: true,
            message: "Google Sheet synced successfully",
            data: {
                insertedRows: result.count,
                maintenanceRows: result.maintCount
            }
        });

    } catch (error) {
        // Clean up the temp file if an error causes a crash halfway through
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }

        console.error("Google Sync Error:", error);
        
        // Custom check for the ECONNRESET network drop
        if (error.code === 'ECONNRESET') {
            return res.status(500).json({
                success: false,
                error: "Connection dropped by Google. Please try syncing again."
            });
        }

        // Axios permission check
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