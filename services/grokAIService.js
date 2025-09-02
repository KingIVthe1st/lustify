const fetch = require('node-fetch');

class GrokAIService {
  constructor() {
    this.apiKey = process.env.GROK_API_KEY;
    this.baseURL = process.env.GROK_API_URL || 'https://api.x.ai/v1';
    
    if (!this.apiKey) {
      throw new Error('GROK_API_KEY environment variable is required');
    }
  }

  async generateImage(prompt, settings = {}) {
    try {
      console.log('Generating image with Grok:', { prompt, settings });
      
      const response = await fetch(`${this.baseURL}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          prompt: prompt,
          model: settings.model || "grok-2-image-1212",
          n: settings.count || 1,
          response_format: settings.format || "url",
          size: settings.size || "1024x1024"
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Grok API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('Grok image generation successful:', result);
      
      return result;
    } catch (error) {
      console.error('Grok image generation error:', error);
      throw error;
    }
  }

  async generateVideoFromImage(imageUrl, settings = {}) {
    try {
      console.log('Generating video from image with Grok:', { imageUrl, settings });
      
      // Note: This endpoint may not be available yet in Grok API
      // This is a placeholder for when it becomes available
      const response = await fetch(`${this.baseURL}/videos/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          image_url: imageUrl,
          model: settings.model || "grok-2-image",
          duration: settings.duration || 6,
          with_audio: settings.withAudio !== false,
          style: settings.style || "natural"
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Grok Video API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('Grok video generation successful:', result);
      
      return result;
    } catch (error) {
      console.error('Grok video generation error:', error);
      // For now, throw an informative error since video API might not be available
      throw new Error('Video generation is not yet available through Grok API. Please try image generation.');
    }
  }

  async createAvatarProfile(description, customization = {}) {
    try {
      console.log('Creating avatar profile with Grok:', { description, customization });
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are an AI avatar creation specialist. Create detailed, consistent character profiles for AI influencers. 

Return a JSON object with the following structure:
{
  "name": "Character name",
  "physicalDescription": "Detailed physical appearance",
  "personality": "Personality traits and characteristics",
  "style": "Fashion and aesthetic preferences", 
  "contentThemes": ["theme1", "theme2"],
  "basePrompt": "Consistent base prompt for image generation",
  "ageRange": "18-25",
  "ethnicity": "specified or mixed",
  "bodyType": "slim/athletic/curvy/etc",
  "hairColor": "color",
  "hairStyle": "style description",
  "eyeColor": "color",
  "clothing": "typical clothing style",
  "setting": "preferred backgrounds/settings"
}

Make it detailed and consistent for content generation.`
            },
            {
              role: "user",
              content: `Create a detailed avatar profile based on: "${description}". Customization preferences: ${JSON.stringify(customization)}. 
              
Focus on creating a character that will be consistent across multiple image generations. Include specific visual details that can be used in prompts.`
            }
          ],
          model: "grok-beta",
          stream: false,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Grok Chat API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('Grok avatar profile creation successful');
      
      return result;
    } catch (error) {
      console.error('Grok avatar profile creation error:', error);
      throw error;
    }
  }

  async optimizePromptForAvatar(avatarData, userPrompt, contentType) {
    try {
      console.log('Optimizing prompt for avatar:', { userPrompt, contentType });
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You create detailed ${contentType} generation prompts that maintain avatar consistency. 

Your task is to take a user's request and avatar profile, then create a detailed prompt that:
1. Maintains the avatar's consistent appearance
2. Includes specific visual details from the avatar profile
3. Incorporates the user's request naturally
4. Uses professional photography/artistic terminology
5. Specifies lighting, composition, and quality

Return ONLY the optimized prompt text, nothing else.`
            },
            {
              role: "user", 
              content: `Avatar Profile: ${JSON.stringify(avatarData)}

User Request: "${userPrompt}"

Create a detailed ${contentType} generation prompt that maintains this avatar's consistent appearance while fulfilling the user's request. Include specific details about appearance, pose, lighting, and setting.`
            }
          ],
          model: "grok-beta",
          stream: false,
          temperature: 0.8
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Grok Prompt Optimization error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('Grok prompt optimization successful');
      
      return result;
    } catch (error) {
      console.error('Grok prompt optimization error:', error);
      throw error;
    }
  }

  // Utility method to check API status
  async checkAPIStatus() {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return {
        status: response.ok ? 'operational' : 'error',
        statusCode: response.status
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  // Helper to calculate estimated credit cost
  calculateEstimatedCost(contentType, settings = {}) {
    const baseCosts = {
      image: 5, // Base cost for image generation
      video: 15 // Base cost for video generation (if available)
    };

    let cost = baseCosts[contentType] || 5;

    // Apply multipliers based on settings
    if (settings.quality === 'hd') cost *= 1.5;
    if (settings.quality === 'premium') cost *= 2;
    
    if (settings.size === '1920x1080') cost *= 1.5;
    if (settings.size === '2048x2048') cost *= 2;

    if (contentType === 'video' && settings.duration) {
      cost *= Math.ceil(settings.duration / 6); // 6 seconds baseline
    }

    return Math.ceil(cost);
  }
}

module.exports = GrokAIService;