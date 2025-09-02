const { validationResult } = require('express-validator');
const ContentService = require('../services/contentService');

class ContentController {
  constructor() {
    this.contentService = new ContentService();
  }

  async generateImage(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user.id;
      const { prompt, settings = {}, avatarId = null } = req.body;

      if (!prompt) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'Prompt is required'
        });
      }

      const content = await this.contentService.generateImage(userId, {
        prompt,
        settings,
        avatarId
      });

      res.status(201).json({
        success: true,
        message: 'Image generation completed',
        data: {
          content
        }
      });

    } catch (error) {
      console.error('Image generation error:', error);
      
      if (error.message.includes('Insufficient credits')) {
        return res.status(402).json({
          error: 'Insufficient credits',
          message: error.message
        });
      }

      if (error.message.includes('Avatar not found')) {
        return res.status(404).json({
          error: 'Avatar not found',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'Image generation failed',
        message: 'Internal server error'
      });
    }
  }

  async generateVideo(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user.id;
      const { imageUrl, settings = {}, avatarId = null } = req.body;

      if (!imageUrl) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'Image URL is required'
        });
      }

      const content = await this.contentService.generateVideo(userId, {
        imageUrl,
        settings,
        avatarId
      });

      res.status(201).json({
        success: true,
        message: 'Video generation completed',
        data: {
          content
        }
      });

    } catch (error) {
      console.error('Video generation error:', error);
      
      if (error.message.includes('Insufficient credits')) {
        return res.status(402).json({
          error: 'Insufficient credits',
          message: error.message
        });
      }

      if (error.message.includes('Avatar not found')) {
        return res.status(404).json({
          error: 'Avatar not found',
          message: error.message
        });
      }

      if (error.message.includes('Video generation is not yet available')) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'Video generation failed',
        message: 'Internal server error'
      });
    }
  }

  async getContent(req, res) {
    try {
      const userId = req.user.id;
      const options = {
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0,
        contentType: req.query.contentType || null,
        avatarId: req.query.avatarId || null,
        status: req.query.status || null
      };

      const result = await this.contentService.getUserContent(userId, options);

      res.json({
        success: true,
        data: {
          content: result.rows,
          pagination: {
            total: result.count,
            limit: options.limit,
            offset: options.offset,
            hasMore: (options.offset + options.limit) < result.count
          }
        }
      });

    } catch (error) {
      console.error('Get content error:', error);
      res.status(500).json({
        error: 'Failed to fetch content',
        message: 'Internal server error'
      });
    }
  }

  async getContentById(req, res) {
    try {
      const userId = req.user.id;
      const contentId = req.params.id;

      if (!contentId) {
        return res.status(400).json({
          error: 'Missing content ID'
        });
      }

      const content = await this.contentService.getContentById(userId, contentId);

      res.json({
        success: true,
        data: {
          content
        }
      });

    } catch (error) {
      console.error('Get content error:', error);
      
      if (error.message === 'Content not found') {
        return res.status(404).json({
          error: 'Content not found'
        });
      }

      res.status(500).json({
        error: 'Failed to fetch content',
        message: 'Internal server error'
      });
    }
  }

  async deleteContent(req, res) {
    try {
      const userId = req.user.id;
      const contentId = req.params.id;

      if (!contentId) {
        return res.status(400).json({
          error: 'Missing content ID'
        });
      }

      const result = await this.contentService.deleteContent(userId, contentId);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Delete content error:', error);
      
      if (error.message === 'Content not found') {
        return res.status(404).json({
          error: 'Content not found'
        });
      }

      res.status(500).json({
        error: 'Content deletion failed',
        message: 'Internal server error'
      });
    }
  }

  async getContentStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await this.contentService.getContentStats(userId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get content stats error:', error);
      res.status(500).json({
        error: 'Failed to fetch content stats',
        message: 'Internal server error'
      });
    }
  }

  async retryGeneration(req, res) {
    try {
      const userId = req.user.id;
      const contentId = req.params.id;

      if (!contentId) {
        return res.status(400).json({
          error: 'Missing content ID'
        });
      }

      const content = await this.contentService.retryFailedGeneration(userId, contentId);

      res.json({
        success: true,
        message: 'Generation retry initiated',
        data: {
          content
        }
      });

    } catch (error) {
      console.error('Retry generation error:', error);
      
      if (error.message === 'Content not found') {
        return res.status(404).json({
          error: 'Content not found'
        });
      }

      if (error.message === 'Content is not in failed state') {
        return res.status(400).json({
          error: 'Invalid operation',
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
        error: 'Generation retry failed',
        message: 'Internal server error'
      });
    }
  }
}

module.exports = ContentController;