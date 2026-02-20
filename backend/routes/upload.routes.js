import express from 'express';
import multer from 'multer';
import { uploadTripData, handleGoogleSheet } from '../controllers/upload.controller.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } 
});

//Local File Upload

router.post('/file', upload.single('file'), uploadTripData);

 //Google Sheets upload

router.post('/google-sheet', handleGoogleSheet);

export default router;