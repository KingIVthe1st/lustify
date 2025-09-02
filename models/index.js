const sequelize = require('../config/database');
const User = require('./User');
const SubscriptionPlan = require('./SubscriptionPlan');
const UserSubscription = require('./UserSubscription');
const UserCredits = require('./UserCredits');
const Avatar = require('./Avatar');
const GeneratedContent = require('./GeneratedContent');
const CreditTransaction = require('./CreditTransaction');

// Define associations
User.hasOne(UserCredits, { foreignKey: 'user_id', as: 'credits' });
UserCredits.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(UserSubscription, { foreignKey: 'user_id', as: 'subscriptions' });
UserSubscription.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserSubscription.belongsTo(SubscriptionPlan, { foreignKey: 'plan_id', as: 'plan' });

User.hasMany(Avatar, { foreignKey: 'user_id', as: 'avatars' });
Avatar.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(GeneratedContent, { foreignKey: 'user_id', as: 'content' });
GeneratedContent.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
GeneratedContent.belongsTo(Avatar, { foreignKey: 'avatar_id', as: 'avatar' });

User.hasMany(CreditTransaction, { foreignKey: 'user_id', as: 'creditTransactions' });
CreditTransaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
CreditTransaction.belongsTo(GeneratedContent, { foreignKey: 'related_content_id', as: 'relatedContent' });
CreditTransaction.belongsTo(UserSubscription, { foreignKey: 'related_subscription_id', as: 'relatedSubscription' });

Avatar.hasMany(GeneratedContent, { foreignKey: 'avatar_id', as: 'content' });

module.exports = {
  sequelize,
  User,
  SubscriptionPlan,
  UserSubscription,
  UserCredits,
  Avatar,
  GeneratedContent,
  CreditTransaction
};