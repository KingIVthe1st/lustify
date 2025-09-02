const express = require('express');
const { authenticateToken, requireEmailVerification } = require('../middleware/auth');
const DashboardController = require('../controllers/dashboardController');

const router = express.Router();
const dashboardController = new DashboardController();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireEmailVerification);

// GET /api/dashboard - Get complete dashboard overview
router.get('/', dashboardController.getDashboardOverview.bind(dashboardController));

// GET /api/dashboard/quick-stats - Get quick statistics
router.get('/quick-stats', dashboardController.getQuickStats.bind(dashboardController));

// GET /api/dashboard/analytics - Get usage analytics with timeframe
router.get('/analytics', dashboardController.getUsageAnalytics.bind(dashboardController));

// GET /api/dashboard/activity - Get recent activity feed
router.get('/activity', dashboardController.getRecentActivity.bind(dashboardController));

// GET /api/dashboard/limits - Get upcoming limits and warnings
router.get('/limits', dashboardController.getUpcomingLimits.bind(dashboardController));

module.exports = router;