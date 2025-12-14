const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');

// Upload profile picture (accepts base64 image)
// For production, integrate with Cloudinary or AWS S3
router.post('/profile-picture', authenticate, async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // Validate base64 image format
    if (!imageBase64.startsWith('data:image/')) {
      return res.status(400).json({ message: 'Invalid image format. Please provide a valid base64 image.' });
    }

    // Limit image size (approximately 5MB for base64)
    if (imageBase64.length > 7 * 1024 * 1024) {
      return res.status(400).json({ message: 'Image too large. Maximum size is 5MB.' });
    }

    const imageUrl = imageBase64; // Store base64 directly (for now)
    // TODO: In production, upload to Cloudinary/S3 and store the URL instead

    // Get user from session
    let session = req.session;
    if (req.headers['x-session-id'] && !session?.userId) {
      const sessionId = req.headers['x-session-id'];
      session = await new Promise((resolve, reject) => {
        req.sessionStore.get(sessionId, (err, sess) => {
          if (err) reject(err);
          else resolve(sess);
        });
      });
    }

    if (!session || !session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Update user profile picture
    const user = await User.findById(session.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.profilePicture = imageUrl;
    await user.save();

    res.json({
      success: true,
      profilePicture: imageUrl,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        accountDetails: user.accountDetails,
        emailVerified: user.emailVerified,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ message: 'Error uploading profile picture', error: error.message });
  }
});

module.exports = router;

