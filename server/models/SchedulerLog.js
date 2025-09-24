const mongoose = require('mongoose');

const SchedulerLogSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  platform: {
    type: String,
    enum: ['twitter', 'linkedin', 'instagram'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed'],
    required: true
  },
  attempt: {
    type: Number,
    default: 1
  },
  scheduledTime: {
    type: Date,
    required: true
  },
  executedTime: Date,
  response: {
    statusCode: Number,
    body: mongoose.Schema.Types.Mixed,
    headers: mongoose.Schema.Types.Mixed
  },
  error: {
    message: String,
    code: String,
    details: mongoose.Schema.Types.Mixed
  },
  duration: Number, // execution time in milliseconds
  nextRetry: Date
}, {
  timestamps: true
});

// Indexes for monitoring and cleanup
SchedulerLogSchema.index({ postId: 1, platform: 1 });
SchedulerLogSchema.index({ status: 1, createdAt: -1 });
SchedulerLogSchema.index({ nextRetry: 1 });

module.exports = mongoose.model('SchedulerLog', SchedulerLogSchema);