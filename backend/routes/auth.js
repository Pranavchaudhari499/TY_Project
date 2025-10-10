// backend/routes/auth.js
console.log('--- AUTH.JS IS RUNNING THE NEWEST VERSION ---');

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const router = express.Router();

// ## POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    // --- MERGED: Added 'dateOfBirth' to destructuring ---
    const { displayName, email, password, phone, location, city, state, gender, weight, dateOfBirth } = req.body;

    // --- NEW: Added validation block for dateOfBirth ---
    if (!dateOfBirth) {
        return res.status(400).json({ message: 'Date of Birth is required.' });
    }
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
        // The getTime() method returns NaN for invalid dates
        return res.status(400).json({ message: 'Invalid Date of Birth format provided.' });
    }
    // ---------------------------------------------------

    const weightNum = weight ? parseInt(weight, 10) : null;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // --- MERGED: Updated User model creation ---
    const newUser = new User({
      displayName,
      email,
      password: hashedPassword,
      phone,
      location: location,
      city,
      state,
      gender,
      weight: weightNum,
      dateOfBirth: dob // Use the parsed and validated date object
    });

    console.log('--- REGISTER: ATTEMPTING TO SAVE USER ---');
    const savedUser = await newUser.save();
    console.log('--- REGISTER: USER SAVED SUCCESSFULLY, ID:', savedUser._id);
    
    const payload = { user: { id: savedUser.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // PRESERVED: Consistent and complete user object
    const userResponse = {
        _id: savedUser._id,
        displayName: savedUser.displayName,
        email: savedUser.email,
        location: savedUser.location,
        donorProfile: savedUser.donorProfile,
        city: savedUser.city,
        state: savedUser.state,
        gender: savedUser.gender,
        weight: savedUser.weight,
        dateOfBirth: savedUser.dateOfBirth, // Added dateOfBirth to response
        role: savedUser.role
    };

    // PRESERVED: Your original response structure
    res.status(201).json({
      message: 'User registered successfully!',
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error('--- !!! REGISTER CATCH BLOCK ERROR !!! ---', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// ## POST /api/auth/login (PRESERVED - NO CHANGES)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log(`--- LOGIN: ATTEMPTING TO FIND USER WITH EMAIL: ${email} ---`);
    const user = await User.findOne({ email });
    console.log('--- LOGIN: FIND USER RESULT ---', user);

    if (!user) {
      console.log('--- LOGIN: User not found in database. ---');
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
        donorProfile: user.donorProfile,
        city: user.city,
        state: user.state,
        gender: user.gender,
        weight: user.weight,
        dateOfBirth: user.dateOfBirth, // Added dateOfBirth to response
        role: user.role
    }
    
    res.json({ token, user: userResponse });
  } catch (error) {
    console.error("--- !!! LOGIN CATCH BLOCK ERROR !!! ---", error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

module.exports = router;