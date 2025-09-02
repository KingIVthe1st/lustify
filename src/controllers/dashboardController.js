const DashboardService = require('../services/dashboardService');

class DashboardController {
  constructor() {
    this.dashboardService = new DashboardService();
  }

  async getDashboardOverview(req, res) {
    try {
      const userId = req.user.id;
      const dashboard = await this.dashboardService.getDashboardOverview(userId);

      res.json({
        success: true,
        data: dashboard
      });

    } catch (error) {
      console.error('Dashboard overview error:', error);
      res.status(500).json({
        error: 'Failed to fetch dashboard data',
        message: 'Internal server error'
      });
    }
  }

  async getQuickStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await this.dashboardService.getQuickStats(userId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Quick stats error:', error);
      res.status(500).json({
        error: 'Failed to fetch quick stats',
        message: 'Internal server error'
      });
    }
  }

  async getUsageAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const timeframe = req.query.timeframe || '30d';

      // Validate timeframe
      if (!['7d', '30d', '90d'].includes(timeframe)) {
        return res.status(400).json({
          error: 'Invalid timeframe',
          message: 'Timeframe must be one of: 7d, 30d, 90d'
        });
      }

      const analytics = await this.dashboardService.getUsageAnalytics(userId, timeframe);

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('Usage analytics error:', error);
      res.status(500).json({
        error: 'Failed to fetch usage analytics',
        message: 'Internal server error'
      });
    }
  }

  async getRecentActivity(req, res) {
    try {
      const userId = req.user.id;
      const options = {
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0
      };

      const activities = await this.dashboardService.getRecentActivity(userId, options);

      res.json({
        success: true,
        data: {
          activities,
          pagination: {
            limit: options.limit,
            offset: options.offset,
            hasMore: activities.length === options.limit
          }
        }
      });

    } catch (error) {
      console.error('Recent activity error:', error);
      res.status(500).json({
        error: 'Failed to fetch recent activity',
        message: 'Internal server error'
      });
    }
  }

  async getUpcomingLimits(req, res) {
    try {
      const userId = req.user.id;
      const limits = await this.dashboardService.getUpcomingLimits(userId);

      res.json({
        success: true,
        data: limits
      });

    } catch (error) {
      console.error('Upcoming limits error:', error);
      res.status(500).json({
        error: 'Failed to fetch upcoming limits',
        message: 'Internal server error'
      });
    }
  }
}

module.exports = DashboardController;