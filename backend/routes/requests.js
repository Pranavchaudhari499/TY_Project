// server/routes/requests.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const BloodRequest = require('../models/bloodRequest');
const User = require('../models/user');

// @route   POST /api/requests
// @desc    Create a blood request and find donors
// @access  Private
router.post('/', auth, async (req, res) => {
  const { bloodType, location } = req.body;

  try {
    // 1. Create and save the new blood request
    const newRequest = new BloodRequest({
      recipient: req.user.id,
      bloodType,
      location
    });
    await newRequest.save();

    // 2. Find nearby, available donors with matching blood type
    const searchRadius = 20000; // 20 kilometers
    const donors = await User.find({
      'donorProfile.bloodType': bloodType,
      'donorProfile.isAvailable': true,
      _id: { $ne: req.user.id }, // Exclude the requester
      location: {
        $near: {
          $geometry: location,
          $maxDistance: searchRadius,
        },
      },
    });

    // 3. --- NOTIFICATION LOGIC (Placeholder) ---
    console.log(`NOTIFICATION: Request for ${bloodType} blood.`);
    console.log(`Found ${donors.length} nearby donor(s) to notify:`);
    donors.forEach(donor => {
      console.log(`- ${donor.displayName} (${donor.email})`);
    });

    // --- SANITIZE DONOR DATA before sending to frontend ---
    const sanitizedDonors = donors.map(donor => ({
      id: donor._id,
      displayName: donor.displayName,
      city: donor.city,
      state: donor.state,
      phone: donor.phone,
      // IMPORTANT: Do NOT send email, password, or exact coordinates
    }));

    // 4. Send response
    res.status(201).json({ 
      message: `Request created. ${donors.length} potential donors in your area have been identified.`,
      request: newRequest,
      donors: sanitizedDonors
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/requests/relevant
// @desc    Get relevant blood requests for the logged-in donor
// @access  Private
router.get('/relevant', auth, async (req, res) => {
  try {
    // 1. Get the logged-in donor's info
    const donor = await User.findById(req.user.id);
    if (!donor || !donor.donorProfile || !donor.donorProfile.bloodType) {
      return res.json([]); // Return empty if user is not a registered donor
    }

    // 2. Find nearby, unfulfilled requests that match the donor's blood type
    const searchRadius = 20000; // 20 kilometers
    const relevantRequests = await BloodRequest.find({
      'bloodType': donor.donorProfile.bloodType,
      'isFulfilled': false,
      'recipient': { $ne: req.user.id }, // Not their own request
      'location': {
        $near: {
          $geometry: donor.location,
          $maxDistance: searchRadius,
        },
      },
    })
    .populate('recipient', 'displayName city state') // Get recipient's info
    .sort({ createdAt: -1 }); // Show newest requests first

    res.json(relevantRequests);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;