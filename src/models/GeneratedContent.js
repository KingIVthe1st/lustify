const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GeneratedContent = sequelize.define('GeneratedContent', {
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
  avatar_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'avatars',
      key: 'id'
    }
  },
  content_type: {
    type: DataTypes.ENUM('image', 'video'),
    allowNull: false
  },
  prompt: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  optimized_prompt: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'AI-optimized prompt used for generation'
  },
  file_url: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  thumbnail_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  file_size: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'File size in bytes'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Video duration in seconds'
  },
  resolution: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'e.g., 1024x1024, 1920x1080'
  },
  credits_used: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  generation_parameters: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Settings used for generation (quality, style, etc.)'
  },
  status: {
    type: DataTypes.ENUM('processing', 'completed', 'failed'),
    defaultValue: 'processing'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  external_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID from external service (Grok, etc.)'
  },
  generation_time: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Time taken to generate in seconds'
  },
  is_favorite: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  download_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'generated_content'
});

module.exports = GeneratedContent;