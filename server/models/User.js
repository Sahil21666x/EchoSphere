const mongoose = require('mongoose');

const ConnectedAccountSchema = new mongoose.Schema({
  accessToken: { type: String, required: true },
  refreshToken: { type: String },
  username: { type: String },
  userId: { type: String },
  expiresAt: { type: Date }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profileInfo: {
    businessName: { type: String, trim: true },
    businessType: { type: String, trim: true },
    targetAudience: { type: String, trim: true },
    brandVoice: { type: String, trim: true }
  },
  connectedAccounts: {
    twitter: ConnectedAccountSchema,
    linkedin: ConnectedAccountSchema,
    instagram: ConnectedAccountSchema
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster email lookups
// UserSchema.index({ email: 1 });

// Remove password from JSON output
UserSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', UserSchema);