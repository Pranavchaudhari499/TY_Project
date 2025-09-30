const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const router = express.Router();

// ## POST /api/auth/register
router.post('/register', async (req, res) => {
  try {

    console.log('Backend received req.body:', req.body);
    const { displayName, email, password, location, city, state, gender} = req.body;
    const weight = req.body.weight ? parseInt(req.body.weight, 10) : null;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({
      displayName,
      email,
      password: hashedPassword,
      location: location,
      city,       // add this
      state,      // add this
      gender,     // add this
      weight,
    });
    const savedUser = await newUser.save();
    const payload = { user: { id: savedUser.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const userResponse = {
        _id: savedUser._id,
        displayName: savedUser.displayName,
        email: savedUser.email,
        location: savedUser.location,
        donorProfile: savedUser.donorProfile
    };
    res.status(201).json({
      message: 'User registered successfully!',
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// ## POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const userResponse = {
        _id: user._id,
        displayName: user.displayName,
        email: user.email,
        location: user.location,
        donorProfile: user.donorProfile
    }
    res.json({ token, user: userResponse });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

module.exports = router;