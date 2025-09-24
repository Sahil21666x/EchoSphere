const cron = require('node-cron');
const Post = require('../models/Post');
const SchedulerLog = require('../models/SchedulerLog');
const socialMediaService = require('./socialMediaService');

class SchedulerService {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
  }

  /**
   * Start the scheduler (runs every minute)
   */
  start() {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }

    // Run every minute to check for posts to publish
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.processScheduledPosts();
    });

    this.isRunning = true;
    console.log('Post scheduler started - checking every minute');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.destroy();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('Post scheduler stopped');
  }

  /**
   * Process posts that are ready to be published
   */
  async processScheduledPosts() {
    try {
      const now = new Date();
      
      // Find posts scheduled for now or earlier that haven't been posted yet
      const postsToPublish = await Post.find({
        scheduledAt: { $lte: now },
        status: { $in: ['scheduled'] },
        retryCount: { $lt: 3 } // Maximum 3 retry attempts
      }).populate('userId');

      console.log(`Found ${postsToPublish.length} posts to publish`);

      for (const post of postsToPublish) {
        await this.publishPost(post);
      }
    } catch (error) {
      console.error('Error processing scheduled posts:', error);
    }
  }

  /**
   * Publish a single post to all its target platforms
   */
  async publishPost(post) {
    console.log(`Publishing post ${post._id} to platforms:`, post.platforms);
    
    // Update post status to posting
    post.status = 'posting';
    post.lastAttempt = new Date();
    await post.save();

    let successCount = 0;
    let failureCount = 0;

    for (const platform of post.platforms) {
      try {
        const result = await this.publishToPlatform(post, platform);
        
        // Log successful publish
        await this.logPublishAttempt(post._id, platform, 'success', result);
        
        // Add result to post
        post.results.push({
          platform,
          postId: result.postId,
          url: result.url,
          success: true,
          postedAt: new Date()
        });
        
        successCount++;
        console.log(`Successfully posted to ${platform}`);
      } catch (error) {
        console.error(`Failed to post to ${platform}:`, error.message);
        
        // Log failed publish
        await this.logPublishAttempt(post._id, platform, 'failed', null, error);
        
        // Add failure result to post
        post.results.push({
          platform,
          success: false,
          error: error.message,
          postedAt: new Date()
        });
        
        failureCount++;
      }
    }

    // Update post final status
    if (successCount > 0 && failureCount === 0) {
      post.status = 'posted';
    } else if (successCount > 0 && failureCount > 0) {
      post.status = 'posted'; // Partial success
    } else {
      post.status = 'failed';
      post.retryCount += 1;
      
      // Schedule retry if under limit
      if (post.retryCount < 3) {
        post.status = 'scheduled';
        post.scheduledAt = new Date(Date.now() + 15 * 60 * 1000); // Retry in 15 minutes
        console.log(`Scheduling retry ${post.retryCount} for post ${post._id}`);
      }
    }

    await post.save();
  }

  /**
   * Publish post to specific platform
   */
  async publishToPlatform(post, platform) {
    const user = post.userId;
    const accountInfo = user.connectedAccounts[platform];
    
    if (!accountInfo) {
      throw new Error(`${platform} account not connected for user`);
    }

    // Use social media service to publish
    return await socialMediaService.publishPost(platform, accountInfo, {
      text: post.content.text,
      hashtags: post.content.hashtags,
      mentions: post.content.mentions,
      media: post.media // TODO: Handle media attachments
    });
  }

  /**
   * Log publish attempt
   */
  async logPublishAttempt(postId, platform, status, response = null, error = null) {
    try {
      const log = new SchedulerLog({
        postId,
        platform,
        status,
        scheduledTime: new Date(),
        executedTime: new Date(),
        response: response ? {
          statusCode: 200,
          body: response
        } : null,
        error: error ? {
          message: error.message,
          code: error.code || 'UNKNOWN',
          details: error
        } : null
      });

      await log.save();
    } catch (logError) {
      console.error('Failed to save scheduler log:', logError);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      running: this.isRunning,
      nextRun: this.cronJob ? this.cronJob.nextDate() : null
    };
  }

  /**
   * Schedule a post manually (for immediate testing)
   */
  async schedulePost(postId) {
    try {
      const post = await Post.findById(postId).populate('userId');
      if (!post) {
        throw new Error('Post not found');
      }

      if (post.status !== 'scheduled') {
        throw new Error('Post is not in scheduled status');
      }

      await this.publishPost(post);
      return { success: true, message: 'Post published successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SchedulerService();