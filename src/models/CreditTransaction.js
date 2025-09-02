const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CreditTransaction = sequelize.define('CreditTransaction', {
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
  transaction_type: {
    type: DataTypes.ENUM('earned', 'used', 'refund', 'bonus', 'expired'),
    allowNull: false
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Positive for earned/bonus, negative for used/expired'
  },
  balance_after: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Credit balance after this transaction'
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  related_content_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'generated_content',
      key: 'id'
    }
  },
  related_subscription_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'user_subscriptions',
      key: 'id'
    }
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional transaction metadata'
  }
}, {
  tableName: 'credit_transactions'
});

module.exports = CreditTransaction;