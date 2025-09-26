const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const { authenticateToken } = require('./middleware/auth');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const connectDB = require('./config/database');
const passport = require('./config/passport');
const schedulerService = require('./services/scheduler');

const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const conversationsRoutes = require('./routes/conversations');
const accountsRoutes = require('./routes/accounts');

const app = express();
const PORT = process.env.PORT || 5000;
const crypto = require('crypto');
const querystring = require('querystring');
const axios = require('axios');
const User = require('./models/User');

connectDB();

app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (!process.env.SESSION_SECRET) {
  console.error('CRITICAL: SESSION_SECRET environment variable is required');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'EchoSphere API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/accounts', accountsRoutes);

// Dashboard routes - proxy to posts routes
app.get('/api/dashboard/stats', authenticateToken, async (req, res, next) => {
  req.url = '/dashboard/stats';
  postsRoutes(req, res, next);
});

app.get('/api/dashboard/recent-posts', authenticateToken, async (req, res, next) => {
  req.url = '/dashboard/recent-posts';
  postsRoutes(req, res, next);
});

app.get('/api/dashboard/upcoming-posts', authenticateToken, async (req, res, next) => {
  req.url = '/dashboard/upcoming-posts';
  postsRoutes(req, res, next);
});

function base64URLEncode(str) {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}


 app.post('/api/accounts/link/twitter', authenticateToken, (req, res) => {
  req.session.userId = req.userId;

  // Generate code verifier & code challenge
  const codeVerifier = base64URLEncode(crypto.randomBytes(32));
  const codeChallenge = base64URLEncode(sha256(codeVerifier));

  req.session.codeVerifier = codeVerifier;

  const params = {
    response_type: 'code',
    client_id: process.env.TWITTER_CLIENT_ID,
    redirect_uri: process.env.TWITTER_CALLBACK_URL,
    scope: 'tweet.read tweet.write users.read offline.access',
    state: crypto.randomBytes(16).toString('hex'),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  };

  const url = `https://twitter.com/i/oauth2/authorize?${querystring.stringify(params)}`;
  res.json({ url });
});


app.get('/auth/twitter', (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Must authenticate via POST /api/accounts/link/twitter first' });
  }

  passport.authenticate('twitter')(req, res, next);
});

app.get('/auth/twitter/callback', async (req, res) => {
  const { code } = req.query;
  const codeVerifier = req.session.codeVerifier;
  const userId = req.session.userId;

  if (!code || !codeVerifier || !userId) {
    return res.redirect(`${CLIENT_URL}/accounts?error=twitter`);
  }

  try {
    // Exchange code for access token + refresh token
    const tokenResponse = await axios.post('https://api.twitter.com/2/oauth2/token', querystring.stringify({
      client_id: process.env.TWITTER_CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.TWITTER_CALLBACK_URL,
      code_verifier: codeVerifier,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded',
       'Authorization': 'Basic ' + Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')
       }
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Save tokens to user in DB
    const user = await User.findById(userId);
    user.connectedAccounts = user.connectedAccounts || {};
    user.connectedAccounts.twitter = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + expires_in * 1000,
      username: user.username // optional: fetch from Twitter API
    };
    await user.save();

    // Clear session PKCE
    delete req.session.codeVerifier;

    res.redirect(`${CLIENT_URL}/accounts?success=twitter`);
  } catch (err) {
    console.error('Twitter OAuth2 error:', err.response?.data || err.message);
    res.redirect(`${CLIENT_URL}/accounts?error=twitter`);
  }
});


app.post('/api/accounts/link/linkedin', authenticateToken, (req, res) => {
  req.session.userId = req.userId;

  const crypto = require('crypto');
  const nonce = crypto.randomBytes(32).toString('hex');
  req.session.oauthNonce = nonce;
  req.session.oauthProvider = 'linkedin';

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({ url: `${baseUrl}/auth/linkedin` });
});

app.get('/auth/linkedin', (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Must authenticate via POST /api/accounts/link/linkedin first' });
  }

  passport.authenticate('linkedin', {
    state: req.session.oauthNonce
  })(req, res, next);
});

app.get('/auth/linkedin-login', passport.authenticate('linkedin-login'));

app.get('/auth/linkedin-login/callback',
  passport.authenticate('linkedin-login', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/dashboard')
);


app.get('/auth/linkedin/callback', 
  (req, res, next) => {
    if (!req.session.userId || !req.session.oauthNonce || req.session.oauthProvider !== 'linkedin') {
      console.error('OAuth callback: Missing session data for CSRF protection');
      return res.redirect(`${CLIENT_URL}/accounts?error=linkedin_csrf`);
    }

    if (req.query.state !== req.session.oauthNonce) {
      console.error('OAuth callback: State mismatch for CSRF protection');
      return res.redirect(`${CLIENT_URL}/accounts?error=linkedin_state`);
    }

    next();
  },
  passport.authenticate('linkedin', { failureRedirect: `${CLIENT_URL}/accounts?error=linkedin` }),
  (req, res) => {
    delete req.session.oauthNonce;
    delete req.session.oauthProvider;
    res.redirect(`${CLIENT_URL}/accounts?success=linkedin`);
  }
);

app.post('/api/accounts/link/instagram', authenticateToken, (req, res) => {
  req.session.userId = req.userId;

  const crypto = require('crypto');
  const nonce = crypto.randomBytes(32).toString('hex');
  req.session.oauthNonce = nonce;
  req.session.oauthProvider = 'instagram';

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({ url: `${baseUrl}/auth/instagram` });
});

app.get('/auth/instagram', (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Must authenticate via POST /api/accounts/link/instagram first' });
  }

  passport.authenticate('instagram', {
    state: req.session.oauthNonce
  })(req, res, next);
});

app.get('/auth/instagram/callback', 
  (req, res, next) => {
    if (!req.session.userId || !req.session.oauthNonce || req.session.oauthProvider !== 'instagram') {
      console.error('OAuth callback: Missing session data for CSRF protection');
      return res.redirect(`${CLIENT_URL}/accounts?error=instagram_csrf`);
    }

    if (req.query.state !== req.session.oauthNonce) {
      console.error('OAuth callback: State mismatch for CSRF protection');
      return res.redirect(`${CLIENT_URL}/accounts?error=instagram_state`);
    }

    next();
  },
  passport.authenticate('instagram', { failureRedirect: `${CLIENT_URL}/accounts?error=instagram` }),
  (req, res) => {
    delete req.session.oauthNonce;
    delete req.session.oauthProvider;
    res.redirect(`${CLIENT_URL}/accounts?success=instagram`);
  }
);

app.get('/api/scheduler/status', (req, res) => {
  const status = schedulerService.getStatus();
  res.json(status);
});

app.post('/api/scheduler/start', (req, res) => {
  try {
    schedulerService.start();
    res.json({ message: 'Scheduler started successfully', running: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start scheduler' });
  }
});

app.post('/api/scheduler/stop', (req, res) => {
  try {
    schedulerService.stop();
    res.json({ message: 'Scheduler stopped successfully', running: false });
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop scheduler' });
  }
});

app.post('/api/scheduler/publish/:postId', async (req, res) => {
  try {
    const result = await schedulerService.schedulePost(req.params.postId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 EchoSphere API server running on http://0.0.0.0:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 AI Service: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`📅 Scheduler: Starting...`);

  schedulerService.start();
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');

  schedulerService.stop();

  server.close(() => {
    console.log('📴 Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
});

module.exports = app;