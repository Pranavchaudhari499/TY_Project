// backend/routes/bloodBankAdmin.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const BloodBank = require('../models/bloodBank');
const User = require('../models/user');

// Middleware to check if user is a bloodbank_admin
const isBloodBankAdmin = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (user.role !== 'bloodbank_admin') {
    return res.status(403).json({ msg: 'Access Denied' });
  }
  next();
};

// @route   POST /api/blood-bank-admin/registrations/:userId/approve
// @desc    Approve a donor's registration request
// @access  Private, Bloodbank_Admin
router.post('/registrations/:userId/approve', [auth, isBloodBankAdmin], async (req, res) => {
  try {
    const applicantId = req.params.userId;
    const bank = await BloodBank.findOne({ admin: req.user.id });
    const applicant = await User.findById(applicantId);

    if (!bank.pendingRegistrations.includes(applicantId)) {
      return res.status(404).json({ msg: 'Registration request not found.' });
    }

    // Move user from pending to registered
    bank.pendingRegistrations.pull(applicantId);
    bank.registeredDonors.push(applicantId);
    
    // Update the blood bank's stock
    const bloodType = applicant.donorProfile.bloodType;
    if (bloodType && bank.stock.hasOwnProperty(bloodType)) {
      bank.stock[bloodType] += 1;
    }

    await bank.save();
    
    // Update the user's profile to link them to this bank
    applicant.bloodBank = bank._id;
    applicant.pendingBankRequest = null; // Clear the pending request
    await applicant.save();

    res.json(bank); // Send back updated bank data
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// @route   POST /api/blood-bank-admin/registrations/:userId/reject
// @desc    Reject a donor's registration request
// @access  Private, Bloodbank_Admin
router.post('/registrations/:userId/reject', [auth, isBloodBankAdmin], async (req, res) => {
  try {
    const applicantId = req.params.userId;
    const bank = await BloodBank.findOne({ admin: req.user.id });

    if (!bank.pendingRegistrations.includes(applicantId)) {
      return res.status(404).json({ msg: 'Registration request not found.' });
    }
    
    // Just remove the user from the pending list
    bank.pendingRegistrations.pull(applicantId);
    await bank.save();

    // Also clear the user's pending status
    await User.findByIdAndUpdate(applicantId, { $set: { pendingBankRequest: null } });


    res.json(bank);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


module.exports = router;