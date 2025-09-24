const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not found in environment variables');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }
  }

  /**
   * Generate content based on user prompt and context
   */
  async generateContent(prompt, context = {}) {
    if (!this.genAI) {
      throw new Error('AI service not configured - GEMINI_API_KEY missing');
    }

    try {
      const { businessInfo, platform, contentType = 'post' } = context;
      
      let systemContext = this.buildSystemContext(businessInfo, platform, contentType);
      let fullPrompt = `${systemContext}\n\nUser request: ${prompt}\n\nGenerate ONLY the post content with relevant hashtags. Do not include any explanations, labels, or formatting markers.`;

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      return this.parseAIResponse(text, contentType);
    } catch (error) {
      console.error('AI generation error:', error);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  /**
   * Generate hashtags for content
   */
  async generateHashtags(content, platform = 'general', count = 5) {
    if (!this.genAI) {
      throw new Error('AI service not configured - GEMINI_API_KEY missing');
    }

    try {
      const prompt = `Generate ${count} relevant hashtags for this ${platform} post content: "${content}". Return only the hashtags separated by spaces, without explanations.`;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract hashtags from response
      const hashtags = text.match(/#\w+/g) || [];
      return hashtags.slice(0, count);
    } catch (error) {
      console.error('Hashtag generation error:', error);
      return [];
    }
  }

  /**
   * Build system context for AI prompts
   */
  buildSystemContext(businessInfo, platform, contentType) {
    let context = `You are a social media content creator assistant. `;
    
    if (businessInfo) {
      context += `Business context: ${businessInfo.businessName || 'User'} `;
      if (businessInfo.businessType) context += `(${businessInfo.businessType}) `;
      if (businessInfo.targetAudience) context += `targeting ${businessInfo.targetAudience}. `;
      if (businessInfo.brandVoice) context += `Brand voice: ${businessInfo.brandVoice}. `;
    }

    if (platform) {
      const platformSpecs = this.getPlatformSpecifications(platform);
      context += platformSpecs;
    }

    context += `\nGenerate engaging ${contentType} content that is platform-appropriate, includes relevant hashtags, and follows best practices for social media engagement.`;
    
    return context;
  }

  /**
   * Get platform-specific content specifications
   */
  getPlatformSpecifications(platform) {
    const specs = {
      twitter: `Create a Twitter post (under 280 characters). Be concise, engaging, and include 2-3 relevant hashtags. Use a conversational tone.`,
      linkedin: `Create a LinkedIn post (up to 1000 characters). Use a professional tone, focus on insights and value. Include 3-5 professional hashtags. Structure with line breaks for readability.`,
      instagram: `Create an Instagram caption. Be engaging and visual-focused, include a call-to-action, and add 5-10 relevant hashtags. Use emojis appropriately.`
    };
    
    return specs[platform] || 'Create engaging social media content with relevant hashtags.';
  }

  /**
   * Parse AI response based on content type
   */
  parseAIResponse(text, contentType) {
    // Clean the response text
    const cleanText = text.trim();
    
    // Extract hashtags from the entire text
    const hashtags = [...new Set(cleanText.match(/#\w+/g) || [])];
    
    // Remove hashtags from main content to get clean text
    let mainContent = cleanText.replace(/#\w+/g, '').trim();
    
    // Clean up extra whitespace and line breaks
    mainContent = mainContent.replace(/\s+/g, ' ').trim();
    
    return {
      text: mainContent,
      hashtags: hashtags,
      suggestions: []
    };
  }

  /**
   * Optimize content for specific platform
   */
  async optimizeForPlatform(content, platform) {
    if (!this.genAI) {
      throw new Error('AI service not configured - GEMINI_API_KEY missing');
    }

    try {
      const platformSpecs = this.getPlatformSpecifications(platform);
      const prompt = `Optimize this content for ${platform}: "${content}"\n\n${platformSpecs}\n\nReturn the optimized content with appropriate hashtags.`;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseAIResponse(text, 'post');
    } catch (error) {
      console.error('Content optimization error:', error);
      return { text: content, hashtags: [], suggestions: [] };
    }
  }
}

module.exports = new AIService();