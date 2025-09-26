const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const { log } = require('console');

class SocialMediaService {
  constructor() {
    this.twitterConsumerKey = process.env.TWITTER_CONSUMER_KEY;
    this.twitterConsumerSecret = process.env.TWITTER_CONSUMER_SECRET;
  }

  /** ==================== PUBLISH POST ==================== */
  async publishPost(platform, accountInfo, content) {
    switch (platform) {
      case 'twitter':
        return this.publishToTwitter(accountInfo, content);
      case 'linkedin':
        return this.publishToLinkedIn(accountInfo, content);
      case 'instagram':
        return this.publishToInstagram(accountInfo, content);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /** -------------------- Twitter -------------------- */
//  async publishToTwitter(accountInfo, content) {
//   if (!accountInfo?.accessToken || !accountInfo?.accessTokenSecret) {
//     throw new Error("Twitter account not connected properly.");
//   }

//   const oauth = OAuth({
//     consumer: {
//       key: this.twitterConsumerKey,          // process.env.TWITTER_CONSUMER_KEY
//       secret: this.twitterConsumerSecret,    // process.env.TWITTER_CONSUMER_SECRET
//     },
//     signature_method: "HMAC-SHA1",
//     hash_function(base_string, key) {
//       return crypto
//         .createHmac("sha1", key)
//         .update(base_string)
//         .digest("base64");
//     },
//   });

//   const url = "https://api.twitter.com/1.1/statuses/update.json";
//   const requestData = {
//     url,
//     method: "POST",
//     data: { status: content.text },
//   };

//   const token = {
//     key: accountInfo.accessToken,
//     secret: accountInfo.accessTokenSecret,
//   };

//   const headers = {
//     ...oauth.toHeader(oauth.authorize(requestData, token)),
//     "Content-Type": "application/x-www-form-urlencoded",
//     Accept: "application/json",
//   };

//   try {
//     const res = await axios.post(
//       url,
//       new URLSearchParams(requestData.data), // ✅ urlencode body
//       { headers }
//     );

//     return {
//       postId: res.data.id_str,
//       url: `https://twitter.com/${accountInfo.username}/status/${res.data.id_str}`,
//       platform: "twitter",
//     };
//   } catch (error) {
//     console.error(
//       "Twitter publish failed:",
//       error.response?.data || error.message || error
//     );
//     return {
//       success: false,
//       error: error.response?.data || error.message || "Unknown error",
//     };
//   }
// }

async publishToTwitter(accountInfo, content) {
  if (!accountInfo?.accessToken || !accountInfo?.username) {
    throw new Error("Twitter account not connected properly.");
  }

  if (!content?.text || content.text.trim() === "") {
    throw new Error("Cannot post empty content.");
  }

  try {
    const url = "https://api.twitter.com/2/tweets";

    const res = await axios.post(
      url,
      { text: content.text },
      {
        headers: {
          Authorization: `Bearer ${accountInfo.accessToken}`, // OAuth2 User Token
          "Content-Type": "application/json",
        },
      }
    );

    return {
      postId: res.data?.data?.id,
      url: `https://twitter.com/${accountInfo.username}/status/${res.data?.data?.id}`,
      platform: "twitter",
    };
  } catch (err) {
    // Prevent circular reference issues
    const errorData = err.response?.data
      ? JSON.stringify(err.response.data)
      : err.message || "Unknown error";

    console.error("Twitter V2 publish failed:", errorData);
    throw new Error(errorData);
  }
}

  async getLinkedinMember(accessToken) {
     const response = await axios.get('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0' },
    })
    
    const memberId = response.data.id
  
    return memberId;

}

  /** -------------------- LinkedIn -------------------- */



  async publishToLinkedIn(accountInfo, content) {
    if (!accountInfo?.accessToken) throw new Error('LinkedIn account not connected.');

    
    const memberId = await this.getLinkedinMember(accountInfo.accessToken);
  
    const apiUrl = 'https://api.linkedin.com/v2/ugcPosts';
    const body = {
      author: `urn:li:person:${memberId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content.text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    };

    try {
      const res = await axios.post(apiUrl, body, {
        headers: { Authorization: `Bearer ${accountInfo.accessToken}`, 'X-Restli-Protocol-Version': '2.0.0', 'Content-Type': 'application/json' },
      });
      return {
        postId: res.data.id,
        url: `https://www.linkedin.com/feed/update/${res.data.id}`,
        platform: 'linkedin',
      };
    } catch (err) {
      // Prevent circular reference issues
    const errorData = err.response?.data
      ? JSON.stringify(err.response.data)
      : err.message || "Unknown error";

    console.error("LinkedIn V2 publish failed:", errorData);
    throw new Error(errorData);
    }
  }

  /** -------------------- Instagram -------------------- */
  async publishToInstagram(accountInfo, content) {
    if (!accountInfo?.accessToken || !accountInfo?.userId) {
      throw new Error('Instagram account not connected.');
    }

    try {
      // 1️⃣ Create media container
      const containerRes = await axios.post(
        `https://graph.facebook.com/v17.0/${accountInfo.userId}/media`,
        { image_url: content.image, caption: content.text, access_token: accountInfo.accessToken }
      );

      const containerId = containerRes.data.id;

      // 2️⃣ Publish container
      const publishRes = await axios.post(
        `https://graph.facebook.com/v17.0/${accountInfo.userId}/media_publish`,
        { creation_id: containerId, access_token: accountInfo.accessToken }
      );

      return {
        postId: publishRes.data.id,
        url: `https://www.instagram.com/p/${publishRes.data.id}/`,
        platform: 'instagram',
      };
    } catch (error) {
      throw new Error(`Instagram publish failed: ${error.response?.data || error.message}`);
    }
  }

  /** ==================== VERIFY CONNECTION ==================== */
  async verifyConnection(platform, accountInfo) {
    switch (platform) {
      case 'twitter':
        return !!(accountInfo?.accessToken && accountInfo?.accessTokenSecret);
      case 'linkedin':
        return !!accountInfo?.accessToken;
      case 'instagram':
        return !!(accountInfo?.accessToken && accountInfo?.userId);
      default:
        return false;
    }
  }

  /** ==================== PLATFORM LIMITS ==================== */
  getPlatformLimits(platform) {
    const limits = {
      twitter: { textLimit: 280, mediaLimit: 4, hashtagLimit: 2 },
      linkedin: { textLimit: 3000, mediaLimit: 1, hashtagLimit: 5 },
      instagram: { textLimit: 2200, mediaLimit: 10, hashtagLimit: 30 },
    };
    return limits[platform] || {};
  }

  validateContent(platform, content) {
    const limits = this.getPlatformLimits(platform);
    const errors = [];

    if (limits.textLimit && content.text?.length > limits.textLimit) errors.push(`Text exceeds ${platform} limit of ${limits.textLimit}`);
    if (limits.hashtagLimit && content.hashtags?.length > limits.hashtagLimit) errors.push(`Too many hashtags for ${platform} (max: ${limits.hashtagLimit})`);
    if (limits.mediaLimit && content.media?.length > limits.mediaLimit) errors.push(`Too many media items for ${platform} (max: ${limits.mediaLimit})`);

    return { isValid: errors.length === 0, errors };
  }
}

module.exports = new SocialMediaService();
