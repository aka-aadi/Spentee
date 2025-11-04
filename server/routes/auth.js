const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Initialize admin user
router.post('/init', async (req, res) => {
  try {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      return res.status(400).json({ 
        message: 'Admin password not configured. Please set ADMIN_PASSWORD environment variable.' 
      });
    }

    const adminExists = await User.findOne({ username: adminUsername });
    if (!adminExists) {
      const admin = new User({
        username: adminUsername,
        password: adminPassword,
        role: 'admin'
      });
      await admin.save();
      return res.json({ message: 'Admin user created successfully' });
    }
    // Ensure existing admin has admin role
    if (adminExists.role !== 'admin') {
      adminExists.role = 'admin';
      await adminExists.save();
      return res.json({ message: 'Admin user role updated' });
    }
    res.json({ message: 'Admin user already exists' });
  } catch (error) {
    res.status(500).json({ message: 'Error initializing admin', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

module.exports = router;


