
const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Post = require('../models/Post');
const Media = require('../models/Media'); 
const { authenticateToken } = require('../middleware/auth');
const aiService = require('../services/aiService');
const socialMediaService = require('../services/socialMediaService');
const router = express.Router();

/**
 * Get user posts with pagination and filtering
 */
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('status').optional().isIn(['draft', 'scheduled', 'posting', 'posted', 'failed']),
  query('platform').optional().isIn(['twitter', 'linkedin', 'instagram'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { userId: req.userId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.platform) filter.platforms = { $in: [req.query.platform] };

    const posts = await Post.find(filter)
      .populate('media')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(filter);

    const formattedPosts = posts.map(post => ({
      id: post._id,
      content: post.content.text,
      platforms: post.platforms,
      scheduledAt: post.scheduledAt,
      status: post.status,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      aiGenerated: post.aiGenerated || false,
      media: post.media,
      results: post.results
    }));

    res.json({
      posts: formattedPosts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to get posts' });
  }
});

/**
 * Dashboard stats
 */
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.userId });
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      scheduledPosts: posts.filter(p => p.status === "scheduled").length,
      publishedThisWeek: posts.filter(p => 
        p.status === "posted" && 
        p.updatedAt && 
        new Date(p.updatedAt) >= weekAgo
      ).length,
      aiGeneratedPosts: posts.filter(p => p.aiGenerated).length,
      totalEngagement: posts.reduce((total, post) => {
        return total + (post.results || []).reduce((sum, result) => {
          const metrics = result.metrics || {};
          return sum + (metrics.likes || 0) + (metrics.shares || 0) + (metrics.comments || 0);
        }, 0);
      }, 0)
    };

    res.json(stats);
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

/**
 * Recent posts for dashboard
 */
router.get('/dashboard/recent-posts', authenticateToken, async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.userId, status: "posted" })
      .sort({ updatedAt: -1 })
      .limit(5);

    const formattedPosts = posts.map(post => ({
      id: post._id,
      content: post.content.text,
      platforms: post.platforms,
      updatedAt: post.updatedAt,
      createdAt: post.createdAt
    }));

    res.json(formattedPosts);
  } catch (error) {
    console.error('Get recent posts error:', error);
    res.status(500).json({ error: 'Failed to get recent posts' });
  }
});

/**
 * Upcoming posts for dashboard
 */
router.get('/dashboard/upcoming-posts', authenticateToken, async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.userId, status: "scheduled" })
      .sort({ scheduledAt: 1 })
      .limit(5);

    const formattedPosts = posts.map(post => ({
      id: post._id,
      content: post.content.text,
      platforms: post.platforms,
      scheduledAt: post.scheduledAt
    }));

    res.json(formattedPosts);
  } catch (error) {
    console.error('Get upcoming posts error:', error);
    res.status(500).json({ error: 'Failed to get upcoming posts' });
  }
});

/**
 * Get single post by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.userId })
      .populate('media')
      .populate('conversationId');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const formattedPost = {
      id: post._id,
      content: post.content.text,
      platforms: post.platforms,
      scheduledAt: post.scheduledAt,
      status: post.status,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      aiGenerated: post.aiGenerated || false,
      media: post.media,
      results: post.results
    };

    res.json(formattedPost);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Failed to get post' });
  }
});

/**
 * Create new post
 */
router.post('/', authenticateToken, [
  body('content').notEmpty().withMessage('Post content is required'),
  body('platforms').isArray({ min: 1 }).withMessage('At least one platform required'),
  body('platforms.*').isIn(['twitter', 'linkedin', 'instagram']).withMessage('Invalid platform'),
  body('scheduledAt').optional().isISO8601().withMessage('Valid scheduled date required'),
  body('status').optional().isIn(['draft', 'scheduled', 'published']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { content, platforms, scheduledAt, status = 'draft', aiGenerated = false, postType = 'static' } = req.body;

    for (const platform of platforms) {
      const validation = socialMediaService.validateContent(platform, { text: content });
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: `Content validation failed for ${platform}`, 
          details: validation.errors 
        });
      }
    }

    const post = new Post({
      userId: req.userId,
      content: {
        text: content,
        hashtags: [],
        mentions: []
      },
      platforms,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      status,
      aiGenerated,
      postType
    });

    await post.save();

    const formattedPost = {
      id: post._id,
      content: post.content.text,
      platforms: post.platforms,
      scheduledAt: post.scheduledAt,
      status: post.status,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      aiGenerated: post.aiGenerated
    };

    res.status(201).json({
      message: 'Post created successfully',
      post: formattedPost
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

/**
 * Update post
 */
router.put('/:id', authenticateToken, [
  body('content').optional().notEmpty().withMessage('Post content cannot be empty'),
  body('platforms').optional().isArray({ min: 1 }).withMessage('At least one platform required'),
  body('platforms.*').optional().isIn(['twitter', 'linkedin', 'instagram']).withMessage('Invalid platform'),
  body('scheduledAt').optional().isISO8601().withMessage('Valid scheduled date required'),
  body('status').optional().isIn(['draft', 'scheduled', 'published']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const post = await Post.findOne({ _id: req.params.id, userId: req.userId });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.status === 'posted') {
      return res.status(400).json({ error: 'Cannot edit published posts' });
    }

    const updates = {};
    if (req.body.content) {
      updates['content.text'] = req.body.content;
    }
    if (req.body.platforms) updates.platforms = req.body.platforms;
    if (req.body.scheduledAt) updates.scheduledAt = new Date(req.body.scheduledAt);
    if (req.body.status) updates.status = req.body.status;

    if (updates['content.text'] || updates.platforms) {
      const contentToValidate = updates['content.text'] || post.content.text;
      const platformsToValidate = updates.platforms || post.platforms;
      
      for (const platform of platformsToValidate) {
        const validation = socialMediaService.validateContent(platform, { text: contentToValidate });
        if (!validation.isValid) {
          return res.status(400).json({ 
            error: `Content validation failed for ${platform}`, 
            details: validation.errors 
          });
        }
      }
    }

    const updatedPost = await Post.findByIdAndUpdate(req.params.id, updates, { new: true });

    const formattedPost = {
      id: updatedPost._id,
      content: updatedPost.content.text,
      platforms: updatedPost.platforms,
      scheduledAt: updatedPost.scheduledAt,
      status: updatedPost.status,
      createdAt: updatedPost.createdAt,
      updatedAt: updatedPost.updatedAt,
      aiGenerated: updatedPost.aiGenerated
    };

    res.json({
      message: 'Post updated successfully',
      post: formattedPost
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

/**
 * Delete post
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.userId });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.status === 'posted') {
      return res.status(400).json({ error: 'Cannot delete published posts' });
    }

    await Post.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

/**
 * Generate AI content for post
 */
router.post('/generate', authenticateToken, [
  body('prompt').notEmpty().withMessage('Prompt is required'),
  body('platform').optional().isIn(['twitter', 'linkedin', 'instagram']).withMessage('Invalid platform'),
  body('contentType').optional().isIn(['post', 'caption', 'hashtags']).withMessage('Invalid content type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { prompt, platform, contentType } = req.body;

    const context = {
      platform,
      contentType: contentType || 'post'
    };

    const generatedContent = await aiService.generateContent(prompt, context);

    res.json({
      success: true,
      content: generatedContent,
      context
    });
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate content' });
  }
});

/**
 * Optimize content for specific platform
 */
router.post('/:id/optimize', authenticateToken, [
  body('platform').isIn(['twitter', 'linkedin', 'instagram']).withMessage('Valid platform required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const post = await Post.findOne({ _id: req.params.id, userId: req.userId });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const { platform } = req.body;
    const optimizedContent = await aiService.optimizeForPlatform(post.content.text, platform);

    res.json({
      success: true,
      originalContent: post.content,
      optimizedContent,
      platform
    });
  } catch (error) {
    console.error('Content optimization error:', error);
    res.status(500).json({ error: error.message || 'Failed to optimize content' });
  }
});

/**
 * Get post analytics/results
 */
router.get('/:id/analytics', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.userId });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const analytics = {
      postId: post._id,
      status: post.status,
      platforms: post.platforms,
      scheduledAt: post.scheduledAt,
      results: post.results,
      retryCount: post.retryCount,
      lastAttempt: post.lastAttempt,
      totalPlatforms: post.platforms.length,
      successfulPosts: post.results.filter(r => r.success).length,
      failedPosts: post.results.filter(r => !r.success).length
    };

    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get post analytics' });
  }
});

module.exports = router;
