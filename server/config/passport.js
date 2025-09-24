const passport = require('passport');
const TwitterStrategy = require('passport-twitter').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const InstagramStrategy = require('passport-instagram').Strategy;
const User = require('../models/User');

/**
 * Configure Passport OAuth strategies
 */

// Serialize/deserialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Twitter OAuth Strategy
if (process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET) {
  passport.use('twitter', new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: process.env.TWITTER_CALLBACK_URL || '/auth/twitter/callback',
    passReqToCallback: true
  }, async (req, token, tokenSecret, profile, done) => {
    try {
      // Load user from session
      const userId = req.session.userId;
      if (!userId) {
        return done(new Error('User must be authenticated'), null);
      }

      const user = await User.findById(userId);
      if (!user) {
        return done(new Error('User not found'), null);
      }

      // Update user with Twitter connection
      user.connectedAccounts.twitter = {
        accessToken: token,
        refreshToken: tokenSecret, // Twitter uses this as token secret
        username: profile.username,
        userId: profile.id
      };

      await user.save();
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// LinkedIn OAuth Strategy
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  passport.use('linkedin', new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: process.env.LINKEDIN_CALLBACK_URL || '/auth/linkedin/callback',
    scope: ['r_liteprofile', 'w_member_social'],
    passReqToCallback: true
  }, async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Load user from session
      const userId = req.session.userId;
      if (!userId) {
        return done(new Error('User must be authenticated'), null);
      }

      const user = await User.findById(userId);
      if (!user) {
        return done(new Error('User not found'), null);
      }

      // Update user with LinkedIn connection
      user.connectedAccounts.linkedin = {
        accessToken: accessToken,
        refreshToken: refreshToken,
        username: profile.displayName,
        userId: profile.id
      };

      await user.save();
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// Instagram OAuth Strategy
if (process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET) {
  passport.use('instagram', new InstagramStrategy({
    clientID: process.env.INSTAGRAM_CLIENT_ID,
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    callbackURL: process.env.INSTAGRAM_CALLBACK_URL || '/auth/instagram/callback',
    passReqToCallback: true
  }, async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Load user from session
      const userId = req.session.userId;
      if (!userId) {
        return done(new Error('User must be authenticated'), null);
      }

      const user = await User.findById(userId);
      if (!user) {
        return done(new Error('User not found'), null);
      }

      // Update user with Instagram connection
      user.connectedAccounts.instagram = {
        accessToken: accessToken,
        refreshToken: refreshToken,
        username: profile.username,
        userId: profile.id
      };

      await user.save();
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

module.exports = passport;