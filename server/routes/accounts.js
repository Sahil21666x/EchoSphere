const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const socialMediaService = require('../services/socialMediaService');
const router = express.Router();

/**
 * Get connected accounts status
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const accounts = {};
    const platforms = ['twitter', 'linkedin', 'instagram'];

    for (const platform of platforms) {
      const accountData = user.connectedAccounts[platform];
      if (accountData) {
        // Verify connection status
        const isValid = await socialMediaService.verifyConnection(platform, accountData);
        
        accounts[platform] = {
          connected: true,
          username: accountData.username,
          userId: accountData.userId,
          isValid,
          connectedAt: accountData.expiresAt || null
        };
      } else {
        accounts[platform] = {
          connected: false,
          isValid: false
        };
      }
    }

    res.json({
      accounts,
      summary: {
        total: platforms.length,
        connected: Object.values(accounts).filter(acc => acc.connected).length,
        valid: Object.values(accounts).filter(acc => acc.connected && acc.isValid).length
      }
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to get account information' });
  }
});

/**
 * Initiate Twitter OAuth
 */
router.get('/twitter/connect', authenticateToken, (req, res, next) => {
  // Store user info in session for OAuth callback
  req.session = req.session || {};
  req.session.userId = req.userId;
  
  passport.authenticate('twitter')(req, res, next);
});

/**
 * Twitter OAuth callback
 */
router.get('/twitter/callback', 
  passport.authenticate('twitter', { 
    failureRedirect: '/accounts?error=twitter',
    session: false 
  }),
  (req, res) => {
    res.redirect('/accounts?success=twitter');
  }
);

router.post("/unlink/:provider", authenticateToken, async (req, res) => {
  const { provider } = req.params; // "twitter" | "linkedin" | "instagram"
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Remove the connected account
    if (user.connectedAccounts[provider]) {
      user.connectedAccounts[provider] = undefined; // or delete user.connectedAccounts[provider];
      await user.save();
      return res.json({ message: `${provider} disconnected successfully` });
    }

    return res.status(400).json({ message: `${provider} not connected` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


/**
 * Initiate LinkedIn OAuth
 */
router.get('/linkedin/connect', authenticateToken, (req, res, next) => {
  // Store user info in session for OAuth callback
  req.session = req.session || {};
  req.session.userId = req.userId;
  
  passport.authenticate('linkedin')(req, res, next);
});

/**
 * LinkedIn OAuth callback
 */
router.get('/linkedin/callback', 
  passport.authenticate('linkedin', { 
    failureRedirect: '/accounts?error=linkedin',
    session: false 
  }),
  (req, res) => {
    res.redirect('/accounts?success=linkedin');
  }
);

/**
 * Initiate Instagram OAuth
 */
router.get('/instagram/connect', authenticateToken, (req, res, next) => {
  // Store user info in session for OAuth callback
  req.session = req.session || {};
  req.session.userId = req.userId;
  
  passport.authenticate('instagram')(req, res, next);
});

/**
 * Instagram OAuth callback
 */
router.get('/instagram/callback', 
  passport.authenticate('instagram', { 
    failureRedirect: '/accounts?error=instagram',
    session: false 
  }),
  (req, res) => {
    res.redirect('/accounts?success=instagram');
  }
);

/**
 * Disconnect account from platform
 */
router.delete('/:platform', authenticateToken, async (req, res) => {
  try {
    const { platform } = req.params;
    
    if (!['twitter', 'linkedin', 'instagram'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.connectedAccounts[platform]) {
      return res.status(404).json({ error: `${platform} account not connected` });
    }

    // Remove the connected account
    user.connectedAccounts[platform] = undefined;
    await user.save();

    res.json({ 
      message: `${platform} account disconnected successfully`,
      platform
    });
  } catch (error) {
    console.error('Disconnect account error:', error);
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

/**
 * Test connection for a platform
 */
router.post('/:platform/test', authenticateToken, async (req, res) => {
  try {
    const { platform } = req.params;
    
    if (!['twitter', 'linkedin', 'instagram'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const accountData = user.connectedAccounts[platform];
    if (!accountData) {
      return res.status(404).json({ error: `${platform} account not connected` });
    }

    // Test the connection
    const isValid = await socialMediaService.verifyConnection(platform, accountData);
    
    if (isValid) {
      res.json({ 
        success: true, 
        message: `${platform} connection is valid`,
        platform,
        username: accountData.username
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: `${platform} connection is invalid or expired`,
        platform,
        suggestion: `Please reconnect your ${platform} account`
      });
    }
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to test connection',
      platform: req.params.platform
    });
  }
});

/**
 * Refresh access token for platform
 */
router.post('/:platform/refresh', authenticateToken, async (req, res) => {
  try {
    const { platform } = req.params;
    
    if (!['twitter', 'linkedin', 'instagram'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const accountData = user.connectedAccounts[platform];
    if (!accountData) {
      return res.status(404).json({ error: `${platform} account not connected` });
    }

    try {
      // Attempt to refresh the token
      const refreshedAccount = await socialMediaService.refreshAccessToken(platform, accountData);
      
      // Update user with refreshed token
      user.connectedAccounts[platform] = refreshedAccount;
      await user.save();

      res.json({ 
        success: true, 
        message: `${platform} token refreshed successfully`,
        platform
      });
    } catch (refreshError) {
      res.status(400).json({ 
        success: false, 
        message: `Failed to refresh ${platform} token: ${refreshError.message}`,
        platform,
        suggestion: `Please reconnect your ${platform} account`
      });
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to refresh token',
      platform: req.params.platform
    });
  }
});

/**
 * Get platform limits and capabilities
 */
router.get('/:platform/limits', authenticateToken, (req, res) => {
  try {
    const { platform } = req.params;
    
    if (!['twitter', 'linkedin', 'instagram'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    const limits = socialMediaService.getPlatformLimits(platform);
    
    res.json({
      platform,
      limits,
      capabilities: {
        text: true,
        images: platform !== 'twitter' || limits.mediaLimit > 0,
        videos: platform === 'instagram' || platform === 'twitter',
        scheduling: true,
        hashtags: true,
        mentions: true
      }
    });
  } catch (error) {
    console.error('Get platform limits error:', error);
    res.status(500).json({ error: 'Failed to get platform information' });
  }
});

module.exports = router;