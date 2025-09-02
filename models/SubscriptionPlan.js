const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SubscriptionPlan = sequelize.define('SubscriptionPlan', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  display_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  price_monthly: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  credits_per_month: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  max_avatars: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  features: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'JSON object containing plan features like {nsfw: true, hd_resolution: true, etc.}'
  },
  stripe_price_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'subscription_plans'
});

module.exports = SubscriptionPlan;