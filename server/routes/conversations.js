
const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Conversation = require('../models/Conversation');
const { authenticateToken } = require('../middleware/auth');
const aiService = require('../services/aiService');
const router = express.Router();

// Fallback content generation
async function generateFallbackContent(prompt, platform) {
  const templates = {
    twitter: {
      content: `💡 ${prompt}\n\nWhat's your take on this? Let me know in the comments! 👇`,
      hashtags: ['#productivity', '#tips', '#motivation']
    },
    linkedin: {
      content: `🚀 ${prompt}\n\nIn today's fast-paced work environment, optimizing our productivity is crucial for success.\n\nHere are some key strategies that can make a real difference:\n\n• Focus on high-impact tasks first\n• Use time-blocking techniques\n• Minimize distractions\n• Take regular breaks\n\nWhat productivity strategies work best for you?\n\n#productivity #worklife #professional`,
      hashtags: ['#productivity', '#worklife', '#professional', '#tips', '#success']
    },
    instagram: {
      content: `✨ ${prompt} ✨\n\nSwipe to see our top recommendations! 👉\n\nDouble tap if you found this helpful! ❤️\n\nTag a friend who needs to see this! 👥`,
      hashtags: ['#productivity', '#tips', '#motivation', '#success', '#worklife', '#lifestyle']
    }
  };
  
  const template = templates[platform] || templates.twitter;
  return {
    platform,
    content: template.content,
    hashtags: template.hashtags,
    characterCount: template.content.length
  };
}

/**
 * Get user conversations with pagination
 */
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const conversations = await Conversation.find({ 
      userId: req.userId,
      isActive: true 
    })
      .select('title createdAt updatedAt messages')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const conversationsWithPreview = conversations.map(conv => {
      const conversation = conv.toObject();
      conversation.messageCount = conversation.messages ? conversation.messages.length : 0;
      conversation.lastMessage = conversation.messages && conversation.messages.length > 0 
        ? {
            content: conversation.messages[conversation.messages.length - 1].content.substring(0, 100),
            role: conversation.messages[conversation.messages.length - 1].role,
            timestamp: conversation.messages[conversation.messages.length - 1].timestamp
          }
        : null;
      
      delete conversation.messages;
      return conversation;
    });

    const total = await Conversation.countDocuments({ userId: req.userId, isActive: true });

    res.json({
      conversations: conversationsWithPreview,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

/**
 * Create conversation and generate AI content (matches frontend usage)
 */
router.post('/', authenticateToken, [
  body('message').trim().isLength({ min: 1 }).withMessage('Message cannot be empty'),
  body('platforms').optional().isArray().withMessage('Platforms must be an array'),
  body('tone').optional().isString().withMessage('Tone must be a string'),
  body('includeHashtags').optional().isBoolean().withMessage('Include hashtags must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { message, platforms = ['twitter', 'linkedin', 'instagram'], tone = 'professional', includeHashtags = true } = req.body;

    // Create new conversation
    const conversation = new Conversation({
      userId: req.userId,
      title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      messages: [{
        role: 'user',
        content: message,
        timestamp: new Date()
      }],
      context: '',
      isActive: true
    });

    // Generate AI content for each platform
    const content = [];
    for (const platform of platforms) {
      try {
        const context = {
          businessInfo: req.user?.businessInfo || {},
          platform,
          tone,
          includeHashtags,
          contentType: 'post'
        };

        const aiResponse = await aiService.generateContent(message, context);
        
        // Ensure we have proper content
        const postContent = aiResponse.text || `Here's a ${platform} post about ${message}`;
        const postHashtags = aiResponse.hashtags && aiResponse.hashtags.length > 0 
          ? aiResponse.hashtags 
          : await aiService.generateHashtags(postContent, platform);
        
        content.push({
          platform,
          content: postContent,
          hashtags: postHashtags,
          characterCount: postContent.length
        });
      } catch (aiError) {
        console.error(`AI generation failed for ${platform}:`, aiError);
        
        // Fallback content generation
        const fallbackContent = await generateFallbackContent(message, platform);
        content.push(fallbackContent);
      }
    }

    // Add AI response to conversation
    conversation.messages.push({
      role: 'assistant',
      content: JSON.stringify({ content }),
      timestamp: new Date()
    });

    await conversation.save();

    res.json({
      success: true,
      content,
      conversation: {
        id: conversation._id,
        title: conversation.title
      }
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

/**
 * Get single conversation with full messages
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

/**
 * Send message to conversation (chat with AI)
 */
router.post('/:id/messages', authenticateToken, [
  body('message').trim().isLength({ min: 1 }).withMessage('Message cannot be empty'),
  body('platform').optional().isIn(['twitter', 'linkedin', 'instagram']).withMessage('Invalid platform'),
  body('contentType').optional().isIn(['post', 'caption', 'hashtags']).withMessage('Invalid content type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const conversation = await Conversation.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const { message, platform, contentType } = req.body;

    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    conversation.messages.push(userMessage);

    try {
      const context = {
        platform,
        contentType: contentType || 'post'
      };

      const aiResponse = await aiService.generateContent(message, context);

      const assistantMessage = {
        role: 'assistant',
        content: JSON.stringify(aiResponse),
        timestamp: new Date()
      };

      conversation.messages.push(assistantMessage);

      const recentMessages = conversation.messages.slice(-10);
      conversation.context = recentMessages.map(msg => 
        `${msg.role}: ${msg.content}`
      ).join('\n');

      if (conversation.title === 'New Conversation' && conversation.messages.length <= 2) {
        conversation.title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
      }

      await conversation.save();

      res.json({
        success: true,
        userMessage,
        assistantMessage: {
          ...assistantMessage,
          parsedContent: aiResponse
        },
        conversation: {
          id: conversation._id,
          title: conversation.title,
          messageCount: conversation.messages.length
        }
      });
    } catch (aiError) {
      await conversation.save();

      res.status(500).json({
        error: 'AI response failed, but your message was saved',
        details: aiError.message,
        userMessage,
        conversation: {
          id: conversation._id,
          title: conversation.title,
          messageCount: conversation.messages.length
        }
      });
    }
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * Update conversation title
 */
router.put('/:id', authenticateToken, [
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title must be 1-100 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { title: req.body.title },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      message: 'Conversation updated successfully',
      conversation
    });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

/**
 * Delete conversation
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isActive: false },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

/**
 * Clear conversation messages
 */
router.delete('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { 
        messages: [],
        context: '',
        title: 'New Conversation'
      },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ 
      message: 'Conversation cleared successfully',
      conversation
    });
  } catch (error) {
    console.error('Clear conversation error:', error);
    res.status(500).json({ error: 'Failed to clear conversation' });
  }
});

module.exports = router;
