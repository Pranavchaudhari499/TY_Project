// backend/routes/users.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // JWT middleware
const User = require('../models/User');

// =========================
// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
// =========================
router.get('/profile', auth, async (req, res) => {
  try {
    console.log('Profile route hit - User ID:', req.user.id);

    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      console.log('User not found in database');
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User found:', user.email);
    res.json(user);

  } catch (error) {
    console.error('Profile route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// =========================
// @route   PUT /api/users/switch-role
// @desc    Switch the user's active role view
// @access  Private
// =========================
router.put('/switch-role', auth, async (req, res) => {
  try {
    const { role } = req.body;

    if (!['donor', 'recipient'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is allowed to switch
    if (user.role !== 'Both' && user.role !== role) {
      return res.status(403).json({ message: 'Role switching not allowed for your account type' });
    }

    user.activeAs = role;
    await user.save();

    // Return updated profile without password
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);

  } catch (error) {
    console.error('Switch role error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});
router.patch('/location', auth, async (req, res) => {
  try {
    const { location } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { location: location } },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- MERGED CODE STARTS HERE ---
router.patch('/donor-profile', auth, async (req, res) => {
  try {
    const { bloodType, isAvailable } = req.body;

    // 1. Fetch the current user from the database
    const user = await User.findById(req.user.id);

    // 2. Check if a blood type is already set and if the user is trying to change it
    if (user.donorProfile && user.donorProfile.bloodType && bloodType) {
        if(user.donorProfile.bloodType !== bloodType){
             return res.status(400).json({ msg: 'Blood type has already been set and cannot be changed.' });
        }
    }

    const donorProfileFields = {
      'donorProfile.isAvailable': isAvailable,
    };

    // Only set bloodType if it's not already defined in the database
    if (!user.donorProfile || !user.donorProfile.bloodType) {
      donorProfileFields['donorProfile.bloodType'] = bloodType;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: donorProfileFields },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(updatedUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
// --- MERGED CODE ENDS HERE ---


module.exports = router;