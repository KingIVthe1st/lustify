const { validationResult } = require('express-validator');
const AvatarService = require('../services/avatarService');

class AvatarController {
  constructor() {
    this.avatarService = new AvatarService();
  }

  async createAvatar(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user.id;
      const { name, description, customization = {} } = req.body;

      if (!name || !description) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Name and description are required'
        });
      }

      const avatar = await this.avatarService.createAvatar(userId, {
        name,
        description,
        customization
      });

      res.status(201).json({
        success: true,
        message: 'Avatar created successfully',
        data: {
          avatar
        }
      });

    } catch (error) {
      console.error('Avatar creation error:', error);
      
      if (error.message.includes('Avatar limit reached')) {
        return res.status(403).json({
          error: 'Avatar limit reached',
          message: error.message
        });
      }

      if (error.message.includes('Insufficient credits')) {
        return res.status(402).json({
          error: 'Insufficient credits',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'Avatar creation failed',
        message: 'Internal server error'
      });
    }
  }

  async getAvatars(req, res) {
    try {
      const userId = req.user.id;
      const options = {
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0,
        status: req.query.status || null,
        contentCategory: req.query.contentCategory || null
      };

      const result = await this.avatarService.getUserAvatars(userId, options);

      res.json({
        success: true,
        data: {
          avatars: result.rows,
          pagination: {
            total: result.count,
            limit: options.limit,
            offset: options.offset,
            hasMore: (options.offset + options.limit) < result.count
          }
        }
      });

    } catch (error) {
      console.error('Get avatars error:', error);
      res.status(500).json({
        error: 'Failed to fetch avatars',
        message: 'Internal server error'
      });
    }
  }

  async getAvatar(req, res) {
    try {
      const userId = req.user.id;
      const avatarId = req.params.id;

      if (!avatarId) {
        return res.status(400).json({
          error: 'Missing avatar ID'
        });
      }

      const avatar = await this.avatarService.getAvatarById(userId, avatarId);

      res.json({
        success: true,
        data: {
          avatar
        }
      });

    } catch (error) {
      console.error('Get avatar error:', error);
      
      if (error.message === 'Avatar not found') {
        return res.status(404).json({
          error: 'Avatar not found'
        });
      }

      res.status(500).json({
        error: 'Failed to fetch avatar',
        message: 'Internal server error'
      });
    }
  }

  async updateAvatar(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user.id;
      const avatarId = req.params.id;
      const updateData = req.body;

      if (!avatarId) {
        return res.status(400).json({
          error: 'Missing avatar ID'
        });
      }

      const avatar = await this.avatarService.updateAvatar(userId, avatarId, updateData);

      res.json({
        success: true,
        message: 'Avatar updated successfully',
        data: {
          avatar
        }
      });

    } catch (error) {
      console.error('Update avatar error:', error);
      
      if (error.message === 'Avatar not found') {
        return res.status(404).json({
          error: 'Avatar not found'
        });
      }

      if (error.message === 'No valid update fields provided') {
        return res.status(400).json({
          error: 'Invalid update data',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'Avatar update failed',
        message: 'Internal server error'
      });
    }
  }

  async deleteAvatar(req, res) {
    try {
      const userId = req.user.id;
      const avatarId = req.params.id;

      if (!avatarId) {
        return res.status(400).json({
          error: 'Missing avatar ID'
        });
      }

      const result = await this.avatarService.deleteAvatar(userId, avatarId);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Delete avatar error:', error);
      
      if (error.message === 'Avatar not found') {
        return res.status(404).json({
          error: 'Avatar not found'
        });
      }

      res.status(500).json({
        error: 'Avatar deletion failed',
        message: 'Internal server error'
      });
    }
  }

  async regenerateThumbnail(req, res) {
    try {
      const userId = req.user.id;
      const avatarId = req.params.id;

      if (!avatarId) {
        return res.status(400).json({
          error: 'Missing avatar ID'
        });
      }

      const avatar = await this.avatarService.regenerateAvatarThumbnail(userId, avatarId);

      res.json({
        success: true,
        message: 'Avatar thumbnail regenerated successfully',
        data: {
          avatar
        }
      });

    } catch (error) {
      console.error('Regenerate thumbnail error:', error);
      
      if (error.message === 'Avatar not found') {
        return res.status(404).json({
          error: 'Avatar not found'
        });
      }

      if (error.message === 'Avatar must be ready to regenerate thumbnail') {
        return res.status(400).json({
          error: 'Invalid avatar status',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'Thumbnail regeneration failed',
        message: 'Internal server error'
      });
    }
  }

  async checkAvatarLimit(req, res) {
    try {
      const userId = req.user.id;
      const limitInfo = await this.avatarService.checkAvatarLimit(userId);

      res.json({
        success: true,
        data: limitInfo
      });

    } catch (error) {
      console.error('Check avatar limit error:', error);
      res.status(500).json({
        error: 'Failed to check avatar limit',
        message: 'Internal server error'
      });
    }
  }

  async getAvatarStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await this.avatarService.getAvatarStats(userId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get avatar stats error:', error);
      res.status(500).json({
        error: 'Failed to fetch avatar stats',
        message: 'Internal server error'
      });
    }
  }
}

module.exports = AvatarController;