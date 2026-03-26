import express from 'express';
import { 
  getCustomRangeData, 
  getDashboardMetrics, 
  getTrendAnalysis, 
  getInsights,
 getWeeklyReportAI,
 getAllTrips,
 getMonthlyReportController,
 getCustomReportController,
 getMaintenanceReportController,
 getCurrentCapacities,
 updateFleetCapacity
} from '../controllers/analytics.controller.js';

const router = express.Router();

router.get('/dashboard', getDashboardMetrics);
router.get('/trends', getTrendAnalysis);
router.get('/insights', getInsights);
router.get('/range', getCustomRangeData); 
router.get('/weekly-report-ai', getWeeklyReportAI); 
router.get('/monthly-report', getMonthlyReportController);
router.get('/trips-all', getAllTrips);
router.get('/custom-report', getCustomReportController);
router.get('/maintenance/report', getMaintenanceReportController);
router.get('/capacity/current', getCurrentCapacities);
router.post('/capacity/update', updateFleetCapacity);

export default router;