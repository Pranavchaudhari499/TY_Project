// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin'); // Import our new admin middleware
const User = require('../models/user');

// @route   GET /api/admin/users
// @desc    Get all users (for admin)
// @access  Private, Admin-only
router.get('/users', [auth, admin], async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// We will add more admin routes here later (for stats, etc.)

module.exports = router;