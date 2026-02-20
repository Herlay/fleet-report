import express from 'express';
import { 
  getCustomRangeData, 
  getDashboardMetrics, 
  getTrendAnalysis, 
  getInsights,
 getWeeklyReportAI,
 getAllTrips
} from '../controllers/analytics.controller.js';

const router = express.Router();

router.get('/dashboard', getDashboardMetrics);
router.get('/trends', getTrendAnalysis);
router.get('/insights', getInsights);
router.get('/range', getCustomRangeData); 
router.get('/weekly-report-ai', getWeeklyReportAI); 
router.get('/trips-all', getAllTrips);

export default router;