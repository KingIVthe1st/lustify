const { UserCredits, CreditTransaction, sequelize } = require('../models');

class CreditService {
  async getUserCredits(userId) {
    try {
      let userCredits = await UserCredits.findOne({
        where: { user_id: userId }
      });

      // Create credits record if it doesn't exist
      if (!userCredits) {
        userCredits = await UserCredits.create({
          user_id: userId,
          current_balance: 0,
          total_earned: 0,
          total_used: 0
        });
      }

      return userCredits;
    } catch (error) {
      console.error('Error getting user credits:', error);
      throw error;
    }
  }

  async deductCredits(userId, amount, description, metadata = {}) {
    const transaction = await sequelize.transaction();
    
    try {
      // Get current balance
      const userCredits = await UserCredits.findOne({
        where: { user_id: userId },
        transaction,
        lock: true // Lock the row to prevent race conditions
      });

      if (!userCredits) {
        throw new Error('User credits record not found');
      }

      if (userCredits.current_balance < amount) {
        throw new Error('Insufficient credits');
      }

      // Calculate new balances
      const newBalance = userCredits.current_balance - amount;
      const newTotalUsed = userCredits.total_used + amount;

      // Update user credits
      await userCredits.update({
        current_balance: newBalance,
        total_used: newTotalUsed,
        updated_at: new Date()
      }, { transaction });

      // Record the transaction
      await CreditTransaction.create({
        user_id: userId,
        transaction_type: 'used',
        amount: -amount, // Negative for deduction
        balance_after: newBalance,
        description,
        metadata
      }, { transaction });

      await transaction.commit();

      console.log(`Deducted ${amount} credits from user ${userId}. New balance: ${newBalance}`);
      
      return {
        success: true,
        newBalance,
        amountDeducted: amount
      };

    } catch (error) {
      await transaction.rollback();
      console.error('Error deducting credits:', error);
      throw error;
    }
  }

  async addCredits(userId, amount, description, metadata = {}) {
    const transaction = await sequelize.transaction();
    
    try {
      // Get or create user credits
      let userCredits = await UserCredits.findOne({
        where: { user_id: userId },
        transaction,
        lock: true
      });

      if (!userCredits) {
        userCredits = await UserCredits.create({
          user_id: userId,
          current_balance: 0,
          total_earned: 0,
          total_used: 0
        }, { transaction });
      }

      // Calculate new balances
      const newBalance = userCredits.current_balance + amount;
      const newTotalEarned = userCredits.total_earned + amount;

      // Update user credits
      await userCredits.update({
        current_balance: newBalance,
        total_earned: newTotalEarned,
        last_refill_date: new Date(),
        updated_at: new Date()
      }, { transaction });

      // Record the transaction
      await CreditTransaction.create({
        user_id: userId,
        transaction_type: 'earned',
        amount: amount, // Positive for addition
        balance_after: newBalance,
        description,
        metadata
      }, { transaction });

      await transaction.commit();

      console.log(`Added ${amount} credits to user ${userId}. New balance: ${newBalance}`);
      
      return {
        success: true,
        newBalance,
        amountAdded: amount
      };

    } catch (error) {
      await transaction.rollback();
      console.error('Error adding credits:', error);
      throw error;
    }
  }

  async refundCredits(userId, amount, description, metadata = {}) {
    const transaction = await sequelize.transaction();
    
    try {
      const userCredits = await UserCredits.findOne({
        where: { user_id: userId },
        transaction,
        lock: true
      });

      if (!userCredits) {
        throw new Error('User credits record not found');
      }

      // Calculate new balances
      const newBalance = userCredits.current_balance + amount;
      const newTotalUsed = Math.max(0, userCredits.total_used - amount); // Don't go below 0

      // Update user credits
      await userCredits.update({
        current_balance: newBalance,
        total_used: newTotalUsed,
        updated_at: new Date()
      }, { transaction });

      // Record the transaction
      await CreditTransaction.create({
        user_id: userId,
        transaction_type: 'refund',
        amount: amount, // Positive for refund
        balance_after: newBalance,
        description,
        metadata
      }, { transaction });

      await transaction.commit();

      console.log(`Refunded ${amount} credits to user ${userId}. New balance: ${newBalance}`);
      
      return {
        success: true,
        newBalance,
        amountRefunded: amount
      };

    } catch (error) {
      await transaction.rollback();
      console.error('Error refunding credits:', error);
      throw error;
    }
  }

  async getCreditTransactionHistory(userId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        transactionType = null,
        startDate = null,
        endDate = null
      } = options;

      const whereClause = { user_id: userId };
      
      if (transactionType) {
        whereClause.transaction_type = transactionType;
      }
      
      if (startDate || endDate) {
        whereClause.created_at = {};
        if (startDate) whereClause.created_at[sequelize.Op.gte] = startDate;
        if (endDate) whereClause.created_at[sequelize.Op.lte] = endDate;
      }

      const transactions = await CreditTransaction.findAndCountAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit,
        offset,
        include: [
          {
            association: 'relatedContent',
            required: false
          }
        ]
      });

      return transactions;
    } catch (error) {
      console.error('Error getting credit transaction history:', error);
      throw error;
    }
  }

  async checkSufficientCredits(userId, requiredAmount) {
    try {
      const userCredits = await this.getUserCredits(userId);
      return {
        sufficient: userCredits.current_balance >= requiredAmount,
        currentBalance: userCredits.current_balance,
        requiredAmount,
        deficit: Math.max(0, requiredAmount - userCredits.current_balance)
      };
    } catch (error) {
      console.error('Error checking sufficient credits:', error);
      throw error;
    }
  }

  async resetMonthlyUsage(userId) {
    const transaction = await sequelize.transaction();
    
    try {
      const userCredits = await UserCredits.findOne({
        where: { user_id: userId },
        transaction,
        lock: true
      });

      if (!userCredits) {
        throw new Error('User credits record not found');
      }

      await userCredits.update({
        monthly_usage_count: 0,
        monthly_usage_reset_date: new Date()
      }, { transaction });

      await transaction.commit();

      return {
        success: true,
        message: 'Monthly usage reset successfully'
      };

    } catch (error) {
      await transaction.rollback();
      console.error('Error resetting monthly usage:', error);
      throw error;
    }
  }

  // Method to handle subscription renewals
  async handleSubscriptionRenewal(userId, subscriptionPlan, metadata = {}) {
    try {
      const creditsToAdd = subscriptionPlan.credits_per_month;
      
      const result = await this.addCredits(
        userId,
        creditsToAdd,
        `Monthly credits for ${subscriptionPlan.display_name} plan`,
        {
          subscription_renewal: true,
          plan_name: subscriptionPlan.name,
          plan_id: subscriptionPlan.id,
          ...metadata
        }
      );

      // Reset monthly usage counter
      await this.resetMonthlyUsage(userId);

      return result;
    } catch (error) {
      console.error('Error handling subscription renewal:', error);
      throw error;
    }
  }

  // Method to calculate credit costs for different operations
  calculateCreditCost(contentType, settings = {}) {
    const baseCosts = {
      image: 5,
      video: 15,
      avatar_creation: 10
    };

    let cost = baseCosts[contentType] || 5;

    // Apply multipliers based on settings
    if (settings.quality === 'hd') cost *= 1.5;
    if (settings.quality === 'premium') cost *= 2;
    
    if (settings.resolution) {
      if (settings.resolution.includes('1920x1080')) cost *= 1.5;
      if (settings.resolution.includes('2048x2048')) cost *= 2;
      if (settings.resolution.includes('4k')) cost *= 3;
    }

    if (contentType === 'video' && settings.duration) {
      cost *= Math.ceil(settings.duration / 6); // 6 seconds baseline
    }

    return Math.ceil(cost);
  }
}

module.exports = CreditService;