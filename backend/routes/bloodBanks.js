// backend/routes/bloodBanks.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // Import mongoose for transactions
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const User = require('../models/user');
const BloodBank = require('../models/bloodBank');

// @route   GET /api/blood-banks
// @desc    Get all registered blood banks
// @access  Private (for logged-in users)
router.get('/', auth, async (req, res) => {
  try {
    const banks = await BloodBank.find().populate('admin', 'displayName');
    res.json(banks);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST /api/blood-banks/register
// @desc     Register a new blood bank and its admin user
// @access   Public
router.post('/register', async (req, res) => {
  const { bankName, city, state, adminName, email, password, location } = req.body;
 
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Check if an admin with this email already exists
    const userExists = await User.findOne({ email }).session(session);
    if (userExists) {
      throw new Error('An account with this email already exists.');
    }

    // 2. Create the new admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newAdmin = new User({
      displayName: adminName,
      email,
      password: hashedPassword,
      city,
      state,
      gender: 'Other', // Or a default/placeholder
      weight: 0,       // Or a default/placeholder
      location,
      role: 'bloodbank_admin', // Assign the correct role
    });
    const savedAdmin = await newAdmin.save({ session });

    // 3. Create the new blood bank, linking to the admin user
    const newBloodBank = new BloodBank({
      name: bankName,
      city,
      state,
      location,
      admin: savedAdmin._id, // Link to the admin we just created
    });
    await newBloodBank.save({ session });

    // 4. If everything is successful, commit the transaction
    await session.commitTransaction();
    res.status(201).json({ message: 'Blood bank registered successfully.' });

  } catch (error) {
    // 5. If anything fails, abort the transaction
    await session.abortTransaction();
    res.status(400).json({ message: error.message || 'Registration failed.' });
  } finally {
    session.endSession();
  }
});

// @route    GET /api/blood-banks/dashboard
// @desc     Get the dashboard data for the logged-in blood bank admin
// @access   Private, Bloodbank_Admin-only
router.get('/dashboard', auth, async (req, res) => {
  try {
    // Find the blood bank managed by this user
    const bloodBank = await BloodBank.findOne({ admin: req.user.id })
      .populate('pendingRegistrations', 'displayName email city weight location donorProfile')
      .populate('registeredDonors', 'displayName email city donorProfile'); // <-- ADD THIS LINE // Get details of pending users

    if (!bloodBank) {
      return res.status(404).json({ msg: 'Blood bank not found for this admin.' });
    }

    res.json(bloodBank);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- MERGED CODE STARTS HERE ---
// @route    POST /api/blood-banks/:bankId/register-request
// @desc     A user requests to register with a specific blood bank
// @access   Private
router.post('/:bankId/register-request', auth, async (req, res) => {
  try {
    const bankId = req.params.bankId;
    const userId = req.user.id;

    const bank = await BloodBank.findById(bankId);
    if (!bank) {
      return res.status(404).json({ msg: 'Blood bank not found' });
    }

    // Prevent duplicate requests
    if (bank.pendingRegistrations.includes(userId) || bank.registeredDonors.includes(userId)) {
      return res.status(400).json({ msg: 'You have already sent a request to this bank.' });
    }

    bank.pendingRegistrations.push(userId);
    await bank.save();

    await User.findByIdAndUpdate(userId, { $set: { pendingBankRequest: bankId } });


    res.json({ msg: 'Your request has been sent to the blood bank for approval.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
// --- MERGED CODE ENDS HERE ---

module.exports = router;