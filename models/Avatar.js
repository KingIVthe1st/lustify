const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Avatar = sequelize.define('Avatar', {
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
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  avatar_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Stores avatar profile, appearance, personality data'
  },
  thumbnail_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  model_file_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('creating', 'ready', 'failed', 'training'),
    defaultValue: 'creating'
  },
  generation_prompt: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Base prompt used for consistent generation'
  },
  style_preferences: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Style settings for content generation'
  },
  content_category: {
    type: DataTypes.ENUM('sfw', 'nsfw', 'both'),
    defaultValue: 'sfw'
  },
  generation_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of times this avatar was used for generation'
  }
}, {
  tableName: 'avatars'
});

module.exports = Avatar;