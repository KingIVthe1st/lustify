const { GeneratedContent, Avatar } = require('../models');
const GrokAIService = require('./grokAIService');
const CreditService = require('./creditService');
const FileStorageService = require('./fileStorageService');

class ContentService {
  constructor() {
    this.grokAI = new GrokAIService();
    this.creditService = new CreditService();
    this.fileStorage = new FileStorageService();
  }

  async generateImage(userId, generationData) {
    try {
      const { prompt, settings = {}, avatarId = null } = generationData;

      // Calculate credit cost
      const creditCost = this.grokAI.calculateEstimatedCost('image', settings);
      
      // Check if user has sufficient credits
      const creditCheck = await this.creditService.checkSufficientCredits(userId, creditCost);
      if (!creditCheck.sufficient) {
        throw new Error(`Insufficient credits. Required: ${creditCost}, Available: ${creditCheck.currentBalance}`);
      }

      let finalPrompt = prompt;
      let avatarData = null;

      // If avatar is specified, get avatar data and optimize prompt
      if (avatarId) {
        const avatar = await Avatar.findOne({
          where: {
            id: avatarId,
            user_id: userId,
            status: 'ready'
          }
        });

        if (!avatar) {
          throw new Error('Avatar not found or not ready');
        }

        avatarData = avatar.avatar_data;

        // Optimize prompt with avatar consistency
        const promptOptimization = await this.grokAI.optimizePromptForAvatar(
          avatarData,
          prompt,
          'image'
        );
        finalPrompt = promptOptimization.choices[0].message.content;
      }

      // Create initial content record
      const content = await GeneratedContent.create({
        user_id: userId,
        avatar_id: avatarId,
        content_type: 'image',
        prompt: prompt,
        optimized_prompt: finalPrompt,
        settings: settings,
        status: 'generating',
        credit_cost: creditCost
      });

      try {
        // Generate image with Grok AI
        console.log('Generating image with optimized prompt:', finalPrompt);
        const imageResult = await this.grokAI.generateImage(finalPrompt, settings);

        if (!imageResult.data || !imageResult.data[0]) {
          throw new Error('No image data returned from Grok AI');
        }

        // Save image to our storage
        const imageUrl = await this.fileStorage.saveFromUrl(
          imageResult.data[0].url,
          `content/${userId}/image_${content.id}_${Date.now()}.jpg`
        );

        // Deduct credits
        await this.creditService.deductCredits(
          userId,
          creditCost,
          `Image generation - ${content.id}`,
          { contentId: content.id, avatarId }
        );

        // Update content record
        await content.update({
          content_url: imageUrl,
          metadata: {
            grok_response: imageResult,
            generation_time: new Date(),
            file_size: imageResult.data[0].file_size || null
          },
          status: 'completed'
        });

        // Update avatar generation count if avatar was used
        if (avatarId && avatarData) {
          await Avatar.increment('generation_count', {
            where: { id: avatarId }
          });
        }

        console.log(`Image generated successfully for user ${userId}, content ${content.id}`);
        return await this.getContentById(userId, content.id);

      } catch (grokError) {
        console.error('Grok AI error during image generation:', grokError);
        
        // Update content status to failed
        await content.update({
          status: 'failed',
          error_message: grokError.message,
          metadata: { error: grokError.message }
        });

        throw new Error(`Image generation failed: ${grokError.message}`);
      }

    } catch (error) {
      console.error('Content generation error:', error);
      throw error;
    }
  }

  async generateVideo(userId, generationData) {
    try {
      const { imageUrl, settings = {}, avatarId = null } = generationData;

      if (!imageUrl) {
        throw new Error('Image URL is required for video generation');
      }

      // Calculate credit cost
      const creditCost = this.grokAI.calculateEstimatedCost('video', settings);
      
      // Check if user has sufficient credits
      const creditCheck = await this.creditService.checkSufficientCredits(userId, creditCost);
      if (!creditCheck.sufficient) {
        throw new Error(`Insufficient credits. Required: ${creditCost}, Available: ${creditCheck.currentBalance}`);
      }

      // Create initial content record
      const content = await GeneratedContent.create({
        user_id: userId,
        avatar_id: avatarId,
        content_type: 'video',
        prompt: `Video from image: ${imageUrl}`,
        settings: settings,
        status: 'generating',
        credit_cost: creditCost,
        metadata: { source_image: imageUrl }
      });

      try {
        // Generate video with Grok AI
        console.log('Generating video from image:', imageUrl);
        const videoResult = await this.grokAI.generateVideoFromImage(imageUrl, settings);

        if (!videoResult.data || !videoResult.data[0]) {
          throw new Error('No video data returned from Grok AI');
        }

        // Save video to our storage
        const videoUrl = await this.fileStorage.saveFromUrl(
          videoResult.data[0].url,
          `content/${userId}/video_${content.id}_${Date.now()}.mp4`
        );

        // Deduct credits
        await this.creditService.deductCredits(
          userId,
          creditCost,
          `Video generation - ${content.id}`,
          { contentId: content.id, avatarId }
        );

        // Update content record
        await content.update({
          content_url: videoUrl,
          metadata: {
            grok_response: videoResult,
            generation_time: new Date(),
            file_size: videoResult.data[0].file_size || null,
            source_image: imageUrl
          },
          status: 'completed'
        });

        // Update avatar generation count if avatar was used
        if (avatarId) {
          await Avatar.increment('generation_count', {
            where: { id: avatarId }
          });
        }

        console.log(`Video generated successfully for user ${userId}, content ${content.id}`);
        return await this.getContentById(userId, content.id);

      } catch (grokError) {
        console.error('Grok AI error during video generation:', grokError);
        
        // Update content status to failed
        await content.update({
          status: 'failed',
          error_message: grokError.message,
          metadata: { error: grokError.message, source_image: imageUrl }
        });

        throw new Error(`Video generation failed: ${grokError.message}`);
      }

    } catch (error) {
      console.error('Video generation error:', error);
      throw error;
    }
  }

  async getContentById(userId, contentId) {
    try {
      const content = await GeneratedContent.findOne({
        where: {
          id: contentId,
          user_id: userId
        },
        include: [
          {
            model: Avatar,
            as: 'avatar',
            attributes: ['id', 'name', 'thumbnail_url']
          }
        ]
      });

      if (!content) {
        throw new Error('Content not found');
      }

      return content;
    } catch (error) {
      console.error('Error getting content by ID:', error);
      throw error;
    }
  }

  async getUserContent(userId, options = {}) {
    try {
      const {
        limit = 20,
        offset = 0,
        contentType = null,
        avatarId = null,
        status = null
      } = options;

      const whereClause = { user_id: userId };
      
      if (contentType) {
        whereClause.content_type = contentType;
      }
      
      if (avatarId) {
        whereClause.avatar_id = avatarId;
      }
      
      if (status) {
        whereClause.status = status;
      }

      const content = await GeneratedContent.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Avatar,
            as: 'avatar',
            attributes: ['id', 'name', 'thumbnail_url']
          }
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      return content;
    } catch (error) {
      console.error('Error getting user content:', error);
      throw error;
    }
  }

  async deleteContent(userId, contentId) {
    try {
      const content = await this.getContentById(userId, contentId);

      // Delete associated files from storage
      if (content.content_url) {
        await this.fileStorage.deleteFile(content.content_url);
      }

      // Delete the content record
      await content.destroy();

      return {
        success: true,
        message: 'Content deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting content:', error);
      throw error;
    }
  }

  async getContentStats(userId) {
    try {
      const stats = await GeneratedContent.findAll({
        where: { user_id: userId },
        attributes: [
          'content_type',
          'status',
          [GeneratedContent.sequelize.fn('COUNT', GeneratedContent.sequelize.col('id')), 'count']
        ],
        group: ['content_type', 'status'],
        raw: true
      });

      const statsMap = {
        total: 0,
        images: { total: 0, completed: 0, failed: 0, generating: 0 },
        videos: { total: 0, completed: 0, failed: 0, generating: 0 }
      };

      stats.forEach(stat => {
        const type = stat.content_type === 'image' ? 'images' : 'videos';
        const count = parseInt(stat.count);
        
        statsMap[type][stat.status] = count;
        statsMap[type].total += count;
        statsMap.total += count;
      });

      // Get total credits used for content generation
      const creditStats = await GeneratedContent.findOne({
        where: { 
          user_id: userId,
          status: 'completed'
        },
        attributes: [
          [GeneratedContent.sequelize.fn('SUM', GeneratedContent.sequelize.col('credit_cost')), 'total_credits_used']
        ],
        raw: true
      });

      statsMap.totalCreditsUsed = parseInt(creditStats.total_credits_used) || 0;

      return statsMap;
    } catch (error) {
      console.error('Error getting content stats:', error);
      throw error;
    }
  }

  async retryFailedGeneration(userId, contentId) {
    try {
      const content = await this.getContentById(userId, contentId);

      if (content.status !== 'failed') {
        throw new Error('Content is not in failed state');
      }

      // Reset content status
      await content.update({
        status: 'generating',
        error_message: null,
        metadata: { ...content.metadata, retry_attempt: (content.metadata.retry_attempt || 0) + 1 }
      });

      // Retry generation based on content type
      if (content.content_type === 'image') {
        return await this.generateImage(userId, {
          prompt: content.prompt,
          settings: content.settings,
          avatarId: content.avatar_id
        });
      } else if (content.content_type === 'video') {
        return await this.generateVideo(userId, {
          imageUrl: content.metadata.source_image,
          settings: content.settings,
          avatarId: content.avatar_id
        });
      }

      throw new Error('Unknown content type for retry');
    } catch (error) {
      console.error('Error retrying failed generation:', error);
      throw error;
    }
  }
}

module.exports = ContentService;