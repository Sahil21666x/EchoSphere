const passport = require('passport');
const TwitterStrategy = require('passport-twitter-oauth2').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const InstagramStrategy = require('passport-instagram').Strategy; // Use Instagram Graph OAuth
const User = require('../models/User');

// Serialize/deserialize user
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

/**
 * Twitter OAuth2 Strategy (User Context)
 */
if (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET) {
  passport.use('twitter', new TwitterStrategy({
      clientID: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
      callbackURL: process.env.TWITTER_CALLBACK_URL || '/auth/twitter/callback',
      scope: ['tweet.read', 'tweet.write', 'users.read'],
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const userId = req.session.userId;
        if (!userId) return done(new Error('User must be authenticated'), null);

        const user = await User.findById(userId);
        if (!user) return done(new Error('User not found'), null);

        user.connectedAccounts = user.connectedAccounts || {};
        user.connectedAccounts.twitter = {
          accessToken,
          refreshToken,
          username: profile.username,
          userId: profile.id
        };

        await user.save();
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  ));
}

/**
 * LinkedIn OAuth2 Strategy
 */

if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  const strategy = new LinkedInStrategy({
      clientID: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      callbackURL: process.env.LINKEDIN_POST_CALLBACK_URL || '/auth/linkedin/callback',
      scope: ['w_member_social'], // only posting permission
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const userId = req.session.userId;
        if (!userId) return done(new Error('User must be authenticated'));

        const user = await User.findById(userId);
        if (!user) return done(new Error('User not found'));

        user.connectedAccounts = user.connectedAccounts || {};
        user.connectedAccounts.linkedin = { accessToken, refreshToken };

        await user.save();
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  );

  // Skip profile fetching
  strategy.userProfile = function(accessToken, done) {
    return done(null, {}); // empty object
  };

  passport.use('linkedin', strategy); // Use 'linkedin' as strategy name
}



/**
 * Instagram OAuth2 (Graph API) Strategy
 */
if (process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET) {
  passport.use('instagram', new InstagramStrategy({
      clientID: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
      callbackURL: process.env.INSTAGRAM_CALLBACK_URL || '/auth/instagram/callback',
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const userId = req.session.userId;
        if (!userId) return done(new Error('User must be authenticated'), null);

        const user = await User.findById(userId);
        if (!user) return done(new Error('User not found'), null);

        user.connectedAccounts = user.connectedAccounts || {};
        user.connectedAccounts.instagram = {
          accessToken,
          refreshToken,
          username: profile.username || profile.id,
          userId: profile.id
        };

        await user.save();
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  ));
}

module.exports = passport;
