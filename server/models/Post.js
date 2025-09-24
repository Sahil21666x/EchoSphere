const mongoose = require('mongoose');

const PostResultSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['twitter', 'linkedin', 'instagram'],
    required: true
  },
  postId: String,
  url: String,
  success: {
    type: Boolean,
    default: false
  },
  error: String,
  postedAt: Date
}, { _id: false });

const PostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  content: {
    text: {
      type: String,
      required: true
    },
    hashtags: [String],
    mentions: [String]
  },
  media: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media'
  }],
  platforms: [{
    type: String,
    enum: ['twitter', 'linkedin', 'instagram'],
    required: true
  }],
  scheduledAt: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'posting', 'posted', 'failed'],
    default: 'draft'
  },
  postType: {
    type: String,
    enum: ['static', 'dynamic'],
    default: 'static'
  },
  results: [PostResultSchema],
  isDraft: {
    type: Boolean,
    default: true
  },
  retryCount: {
    type: Number,
    default: 0
  },
  lastAttempt: Date
}, {
  timestamps: true
});

// Indexes for efficient querying
PostSchema.index({ userId: 1, status: 1 });
PostSchema.index({ scheduledAt: 1, status: 1 });
PostSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Post', PostSchema);