const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserSubscription = sequelize.define('UserSubscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  plan_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'subscription_plans',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'canceled', 'expired', 'past_due', 'trialing'),
    defaultValue: 'active'
  },
  current_period_start: {
    type: DataTypes.DATE,
    allowNull: false
  },
  current_period_end: {
    type: DataTypes.DATE,
    allowNull: false
  },
  stripe_subscription_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stripe_customer_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cancel_at_period_end: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  canceled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  trial_end: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'user_subscriptions'
});

module.exports = UserSubscription;