const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserCredits = sequelize.define('UserCredits', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  current_balance: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  total_earned: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  total_used: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  last_refill_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  monthly_usage_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  monthly_usage_reset_date: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'user_credits'
});

module.exports = UserCredits;