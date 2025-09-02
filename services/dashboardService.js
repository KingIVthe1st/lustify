const { User, UserCredits, Avatar, GeneratedContent, UserSubscription, SubscriptionPlan, CreditTransaction } = require('../models');
const AvatarService = require('./avatarService');
const ContentService = require('./contentService');
const CreditService = require('./creditService');
const SubscriptionService = require('./subscriptionService');

class DashboardService {
  constructor() {
    this.avatarService = new AvatarService();
    this.contentService = new ContentService();
    this.creditService = new CreditService();
    this.subscriptionService = new SubscriptionService();
  }

  async getDashboardOverview(userId) {
    try {
      // Get all dashboard data in parallel for better performance
      const [
        userProfile,
        credits,
        subscription,
        avatarStats,
        contentStats,
        recentActivity
      ] = await Promise.all([
        this.getUserProfile(userId),
        this.creditService.getUserCredits(userId),
        this.subscriptionService.getUserSubscription(userId),
        this.avatarService.getAvatarStats(userId),
        this.contentService.getContentStats(userId),
        this.getRecentActivity(userId, { limit: 10 })
      ]);

      return {
        user: userProfile,
        credits,
        subscription,
        avatars: avatarStats,
        content: contentStats,
        recentActivity
      };

    } catch (error) {
      console.error('Dashboard overview error:', error);
      throw error;
    }
  }

  async getUserProfile(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: {
          exclude: ['password_hash', 'password_reset_token', 'email_verification_token']
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  async getRecentActivity(userId, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;

      // Get recent activities from different sources
      const [recentContent, recentTransactions] = await Promise.all([
        GeneratedContent.findAll({
          where: { user_id: userId },
          include: [
            {
              model: Avatar,
              as: 'avatar',
              attributes: ['id', 'name']
            }
          ],
          order: [['created_at', 'DESC']],
          limit: Math.floor(limit / 2),
          offset
        }),
        CreditTransaction.findAll({
          where: { user_id: userId },
          order: [['created_at', 'DESC']],
          limit: Math.floor(limit / 2),
          offset
        })
      ]);

      // Combine and format activities
      const activities = [];

      // Add content generation activities
      recentContent.forEach(content => {
        activities.push({
          id: `content-${content.id}`,
          type: 'content_generation',
          title: `Generated ${content.content_type}`,
          description: content.prompt ? content.prompt.substring(0, 100) + '...' : 'Content generation',
          status: content.status,
          avatar: content.avatar ? content.avatar.name : null,
          timestamp: content.created_at,
          metadata: {
            contentId: content.id,
            contentType: content.content_type,
            creditCost: content.credit_cost
          }
        });
      });

      // Add credit transaction activities
      recentTransactions.forEach(transaction => {
        activities.push({
          id: `transaction-${transaction.id}`,
          type: 'credit_transaction',
          title: `Credits ${transaction.transaction_type}`,
          description: transaction.description,
          status: 'completed',
          amount: transaction.amount,
          timestamp: transaction.created_at,
          metadata: {
            transactionId: transaction.id,
            transactionType: transaction.transaction_type,
            balanceAfter: transaction.balance_after
          }
        });
      });

      // Sort by timestamp descending and limit
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return activities.slice(0, limit);

    } catch (error) {
      console.error('Error getting recent activity:', error);
      throw error;
    }
  }

  async getUsageAnalytics(userId, timeframe = '30d') {
    try {
      const now = new Date();
      let startDate;

      switch (timeframe) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const [contentAnalytics, creditAnalytics] = await Promise.all([
        this.getContentAnalytics(userId, startDate, now),
        this.getCreditAnalytics(userId, startDate, now)
      ]);

      return {
        timeframe,
        period: {
          start: startDate,
          end: now
        },
        content: contentAnalytics,
        credits: creditAnalytics
      };

    } catch (error) {
      console.error('Error getting usage analytics:', error);
      throw error;
    }
  }

  async getContentAnalytics(userId, startDate, endDate) {
    try {
      const contentStats = await GeneratedContent.findAll({
        where: {
          user_id: userId,
          created_at: {
            [require('sequelize').Op.between]: [startDate, endDate]
          }
        },
        attributes: [
          'content_type',
          'status',
          [GeneratedContent.sequelize.fn('COUNT', GeneratedContent.sequelize.col('id')), 'count'],
          [GeneratedContent.sequelize.fn('DATE', GeneratedContent.sequelize.col('created_at')), 'date']
        ],
        group: ['content_type', 'status', 'date'],
        order: [['date', 'ASC']],
        raw: true
      });

      // Process data for frontend consumption
      const dailyStats = {};
      const totals = { images: 0, videos: 0, total: 0 };

      contentStats.forEach(stat => {
        const date = stat.date;
        const type = stat.content_type;
        const status = stat.status;
        const count = parseInt(stat.count);

        if (!dailyStats[date]) {
          dailyStats[date] = {
            date,
            images: { total: 0, completed: 0, failed: 0 },
            videos: { total: 0, completed: 0, failed: 0 },
            total: 0
          };
        }

        const typeKey = type === 'image' ? 'images' : 'videos';
        dailyStats[date][typeKey][status] = count;
        dailyStats[date][typeKey].total += count;
        dailyStats[date].total += count;

        if (status === 'completed') {
          totals[typeKey] += count;
          totals.total += count;
        }
      });

      return {
        daily: Object.values(dailyStats),
        totals
      };

    } catch (error) {
      console.error('Error getting content analytics:', error);
      throw error;
    }
  }

  async getCreditAnalytics(userId, startDate, endDate) {
    try {
      const creditStats = await CreditTransaction.findAll({
        where: {
          user_id: userId,
          created_at: {
            [require('sequelize').Op.between]: [startDate, endDate]
          }
        },
        attributes: [
          'transaction_type',
          [CreditTransaction.sequelize.fn('SUM', CreditTransaction.sequelize.col('amount')), 'total_amount'],
          [CreditTransaction.sequelize.fn('COUNT', CreditTransaction.sequelize.col('id')), 'count'],
          [CreditTransaction.sequelize.fn('DATE', CreditTransaction.sequelize.col('created_at')), 'date']
        ],
        group: ['transaction_type', 'date'],
        order: [['date', 'ASC']],
        raw: true
      });

      // Process data
      const dailyStats = {};
      const totals = { earned: 0, used: 0, refunded: 0 };

      creditStats.forEach(stat => {
        const date = stat.date;
        const type = stat.transaction_type;
        const amount = parseInt(stat.total_amount);
        const count = parseInt(stat.count);

        if (!dailyStats[date]) {
          dailyStats[date] = {
            date,
            earned: 0,
            used: 0,
            refunded: 0,
            net: 0
          };
        }

        dailyStats[date][type] = Math.abs(amount);
        totals[type] += Math.abs(amount);
      });

      // Calculate net for each day
      Object.values(dailyStats).forEach(day => {
        day.net = day.earned + day.refunded - day.used;
      });

      return {
        daily: Object.values(dailyStats),
        totals: {
          ...totals,
          net: totals.earned + totals.refunded - totals.used
        }
      };

    } catch (error) {
      console.error('Error getting credit analytics:', error);
      throw error;
    }
  }

  async getQuickStats(userId) {
    try {
      const [credits, avatarCount, contentCount, activeSubscription] = await Promise.all([
        UserCredits.findOne({
          where: { user_id: userId }
        }),
        Avatar.count({
          where: { 
            user_id: userId,
            status: 'ready'
          }
        }),
        GeneratedContent.count({
          where: { 
            user_id: userId,
            status: 'completed'
          }
        }),
        UserSubscription.findOne({
          where: {
            user_id: userId,
            status: 'active'
          },
          include: [{
            model: SubscriptionPlan,
            as: 'plan'
          }]
        })
      ]);

      return {
        credits: {
          current: credits?.current_balance || 0,
          total_earned: credits?.total_earned || 0,
          total_used: credits?.total_used || 0
        },
        avatars: {
          count: avatarCount,
          limit: activeSubscription?.plan?.max_avatars || 1
        },
        content: {
          generated: contentCount
        },
        subscription: {
          active: !!activeSubscription,
          plan: activeSubscription?.plan?.display_name || 'Free',
          expires: activeSubscription?.current_period_end || null
        }
      };

    } catch (error) {
      console.error('Error getting quick stats:', error);
      throw error;
    }
  }

  async getUpcomingLimits(userId) {
    try {
      const [avatarLimit, subscription] = await Promise.all([
        this.avatarService.checkAvatarLimit(userId),
        this.subscriptionService.getUserSubscription(userId)
      ]);

      const limits = {
        avatars: {
          current: avatarLimit.currentCount,
          max: avatarLimit.maxAvatars,
          remaining: avatarLimit.remaining,
          warning: avatarLimit.remaining <= 1
        }
      };

      // Add subscription expiry warning if applicable
      if (subscription && subscription.current_period_end) {
        const daysUntilExpiry = Math.ceil(
          (new Date(subscription.current_period_end) - new Date()) / (1000 * 60 * 60 * 24)
        );
        
        limits.subscription = {
          expires_in_days: daysUntilExpiry,
          warning: daysUntilExpiry <= 7,
          cancel_at_period_end: subscription.cancel_at_period_end
        };
      }

      return limits;

    } catch (error) {
      console.error('Error getting upcoming limits:', error);
      throw error;
    }
  }
}

module.exports = DashboardService;