const { Avatar, UserSubscription, SubscriptionPlan } = require('../models');
const GrokAIService = require('./grokAIService');
const CreditService = require('./creditService');
const FileStorageService = require('./fileStorageService');

class AvatarService {
  constructor() {
    this.grokAI = new GrokAIService();
    this.creditService = new CreditService();
    this.fileStorage = new FileStorageService();
  }

  async createAvatar(userId, avatarData) {
    try {
      const { name, description, customization = {} } = avatarData;

      // Check user's avatar limit based on subscription
      const avatarLimit = await this.checkAvatarLimit(userId);
      if (!avatarLimit.allowed) {
        throw new Error(`Avatar limit reached. Your plan allows ${avatarLimit.maxAvatars} avatars maximum.`);
      }

      // Create initial avatar record
      const avatar = await Avatar.create({
        user_id: userId,
        name,
        description,
        status: 'creating',
        content_category: customization.contentCategory || 'sfw'
      });

      // Generate avatar profile using Grok AI
      console.log('Generating avatar profile with Grok AI...');
      
      try {
        const profileResponse = await this.grokAI.createAvatarProfile(description, customization);
        const avatarProfileText = profileResponse.choices[0].message.content;
        
        // Try to parse as JSON, fallback to text if it fails
        let avatarProfile;
        try {
          avatarProfile = JSON.parse(avatarProfileText);
        } catch {
          // If JSON parsing fails, create a structured object
          avatarProfile = {
            name: name,
            description: avatarProfileText,
            physicalDescription: avatarProfileText.substring(0, 500),
            basePrompt: `Professional portrait of ${description}`,
            contentCategory: customization.contentCategory || 'sfw'
          };
        }

        // Generate thumbnail image
        const thumbnailPrompt = avatarProfile.basePrompt || 
          `Professional portrait photo of ${avatarProfile.physicalDescription || description}, high quality, studio lighting, detailed`;

        console.log('Generating avatar thumbnail...');
        const thumbnailResult = await this.grokAI.generateImage(thumbnailPrompt, {
          size: '512x512',
          quality: 'standard'
        });

        let thumbnailUrl = null;
        if (thumbnailResult.data && thumbnailResult.data[0]) {
          // Save thumbnail to our storage
          thumbnailUrl = await this.fileStorage.saveFromUrl(
            thumbnailResult.data[0].url,
            `avatars/${userId}/thumbnail_${avatar.id}.jpg`
          );
        }

        // Update avatar with generated data
        await avatar.update({
          avatar_data: avatarProfile,
          generation_prompt: avatarProfile.basePrompt || thumbnailPrompt,
          thumbnail_url: thumbnailUrl,
          style_preferences: customization,
          status: 'ready'
        });

        console.log(`Avatar ${avatar.id} created successfully for user ${userId}`);
        
        return await this.getAvatarById(userId, avatar.id);

      } catch (grokError) {
        console.error('Grok AI error during avatar creation:', grokError);
        
        // Update avatar status to failed
        await avatar.update({
          status: 'failed',
          avatar_data: { error: grokError.message }
        });

        throw new Error(`Failed to generate avatar: ${grokError.message}`);
      }

    } catch (error) {
      console.error('Avatar creation error:', error);
      throw error;
    }
  }

  async getAvatarById(userId, avatarId) {
    try {
      const avatar = await Avatar.findOne({
        where: {
          id: avatarId,
          user_id: userId
        }
      });

      if (!avatar) {
        throw new Error('Avatar not found');
      }

      return avatar;
    } catch (error) {
      console.error('Error getting avatar by ID:', error);
      throw error;
    }
  }

  async getUserAvatars(userId, options = {}) {
    try {
      const {
        limit = 20,
        offset = 0,
        status = null,
        contentCategory = null
      } = options;

      const whereClause = { user_id: userId };
      
      if (status) {
        whereClause.status = status;
      }
      
      if (contentCategory) {
        whereClause.content_category = contentCategory;
      }

      const avatars = await Avatar.findAndCountAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      return avatars;
    } catch (error) {
      console.error('Error getting user avatars:', error);
      throw error;
    }
  }

  async updateAvatar(userId, avatarId, updateData) {
    try {
      const avatar = await this.getAvatarById(userId, avatarId);

      const allowedUpdates = ['name', 'description', 'content_category'];
      const updates = {};

      allowedUpdates.forEach(field => {
        if (updateData[field] !== undefined) {
          updates[field] = updateData[field];
        }
      });

      if (Object.keys(updates).length === 0) {
        throw new Error('No valid update fields provided');
      }

      await avatar.update(updates);

      return await this.getAvatarById(userId, avatarId);
    } catch (error) {
      console.error('Error updating avatar:', error);
      throw error;
    }
  }

  async deleteAvatar(userId, avatarId) {
    try {
      const avatar = await this.getAvatarById(userId, avatarId);

      // Delete associated files from storage
      if (avatar.thumbnail_url) {
        await this.fileStorage.deleteFile(avatar.thumbnail_url);
      }

      // Delete the avatar record
      await avatar.destroy();

      return {
        success: true,
        message: 'Avatar deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting avatar:', error);
      throw error;
    }
  }

  async checkAvatarLimit(userId) {
    try {
      // Get user's current subscription
      const subscription = await UserSubscription.findOne({
        where: { 
          user_id: userId,
          status: 'active'
        },
        include: [{
          model: SubscriptionPlan,
          as: 'plan'
        }]
      });

      let maxAvatars = 1; // Default limit
      
      if (subscription && subscription.plan) {
        maxAvatars = subscription.plan.max_avatars;
      }

      // Count current avatars
      const currentAvatarCount = await Avatar.count({
        where: { 
          user_id: userId,
          status: ['ready', 'creating'] // Don't count failed avatars
        }
      });

      return {
        allowed: currentAvatarCount < maxAvatars,
        currentCount: currentAvatarCount,
        maxAvatars,
        remaining: Math.max(0, maxAvatars - currentAvatarCount)
      };
    } catch (error) {
      console.error('Error checking avatar limit:', error);
      throw error;
    }
  }

  async regenerateAvatarThumbnail(userId, avatarId) {
    try {
      const avatar = await this.getAvatarById(userId, avatarId);
      
      if (avatar.status !== 'ready') {
        throw new Error('Avatar must be ready to regenerate thumbnail');
      }

      const avatarData = avatar.avatar_data;
      const thumbnailPrompt = avatarData.basePrompt || 
        `Professional portrait photo of ${avatarData.physicalDescription || avatar.description}, high quality, studio lighting`;

      console.log('Regenerating avatar thumbnail...');
      const thumbnailResult = await this.grokAI.generateImage(thumbnailPrompt, {
        size: '512x512',
        quality: 'standard'
      });

      let thumbnailUrl = avatar.thumbnail_url;
      if (thumbnailResult.data && thumbnailResult.data[0]) {
        // Delete old thumbnail
        if (thumbnailUrl) {
          await this.fileStorage.deleteFile(thumbnailUrl);
        }

        // Save new thumbnail
        thumbnailUrl = await this.fileStorage.saveFromUrl(
          thumbnailResult.data[0].url,
          `avatars/${userId}/thumbnail_${avatar.id}_${Date.now()}.jpg`
        );

        await avatar.update({ thumbnail_url: thumbnailUrl });
      }

      return await this.getAvatarById(userId, avatarId);
    } catch (error) {
      console.error('Error regenerating avatar thumbnail:', error);
      throw error;
    }
  }

  async getAvatarStats(userId) {
    try {
      const stats = await Avatar.findAll({
        where: { user_id: userId },
        attributes: [
          'status',
          [Avatar.sequelize.fn('COUNT', Avatar.sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      const statsMap = {
        total: 0,
        ready: 0,
        creating: 0,
        failed: 0
      };

      stats.forEach(stat => {
        statsMap[stat.status] = parseInt(stat.count);
        statsMap.total += parseInt(stat.count);
      });

      // Get most used avatar
      const mostUsedAvatar = await Avatar.findOne({
        where: { 
          user_id: userId,
          status: 'ready'
        },
        order: [['generation_count', 'DESC']],
        limit: 1
      });

      return {
        ...statsMap,
        mostUsedAvatar: mostUsedAvatar ? {
          id: mostUsedAvatar.id,
          name: mostUsedAvatar.name,
          generationCount: mostUsedAvatar.generation_count
        } : null
      };
    } catch (error) {
      console.error('Error getting avatar stats:', error);
      throw error;
    }
  }
}

module.exports = AvatarService;