const express = require('express');
const router = express.Router();
const axios = require('axios'); 
const auth = require('../middleware/auth');
const BloodRequest = require('../models/bloodRequest');
const User = require('../models/user');
const BloodBank = require('../models/BloodBank');

// @route   POST /api/requests
// @desc    Create a blood request and find donors AND blood banks with ML scoring
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

    const searchRadius = 20000; // 20 kilometers

    // --- SEARCH 1: Find Individual Donors ---
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

    // --- ML INTEGRATION: Get availability scores for each donor ---
    const scoredDonorsPromises = donors.map(async (donor) => {
      // Prepare features for the model with safe defaults
      const age = donor.age || (donor.dateOfBirth ? (new Date().getFullYear() - new Date(donor.dateOfBirth).getFullYear()) : 30);
      const daysSinceLastDonation = donor.donorProfile.lastDonatedOn 
        ? Math.floor((new Date() - new Date(donor.donorProfile.lastDonatedOn)) / (1000 * 60 * 60 * 24))
        : 90;
      const totalNotifications = donor.donorProfile.donationHistory.length;
      const timesDonated = donor.donorProfile.donationHistory.filter(h => h.status === 'donated').length;
      const responseRate = totalNotifications > 0 ? timesDonated / totalNotifications : 0.5;

      const features = {
        age: age,
        days_since_last_donation: daysSinceLastDonation,
        total_notifications: totalNotifications,
        times_donated: timesDonated,
        response_rate: responseRate,
      };
      
      console.log(`🔍 ML Features for ${donor.displayName}:`, features);
      
      try {
        const predictionResponse = await axios.post('http://localhost:5001/predict-availability', features);
        return { ...donor.toObject(), availability_score: predictionResponse.data.availability_score };
      } catch (mlError) {
        console.error("ML service error for donor:", donor._id, mlError.message);
        return { ...donor.toObject(), availability_score: 0.1 };
      }
    });

    const scoredDonors = await Promise.all(scoredDonorsPromises);

    // --- SORT DONORS by availability score (highest first) ---
    scoredDonors.sort((a, b) => b.availability_score - a.availability_score);

    // --- Update donation history for notified donors (AFTER ML scoring) ---
    const donorIds = donors.map(d => d._id);
    await User.updateMany(
      { _id: { $in: donorIds } },
      { $push: { 'donorProfile.donationHistory': { status: 'notified' } } }
    );

    // --- SEARCH 2: Find Nearby Blood Banks ---
    const bloodBanks = await BloodBank.find({
      [`stock.${bloodType}`]: { $gt: 0 },
      location: {
        $near: {
          $geometry: location,
          $maxDistance: searchRadius,
        },
      },
    });

    // --- NOTIFICATION LOGIC (Enhanced with Socket.io) ---
    console.log(`NOTIFICATION: Request for ${bloodType} blood.`);
    console.log(`Found ${scoredDonors.length} nearby donor(s) and ${bloodBanks.length} blood bank(s) to notify:`);
    
    const io = req.app.get('socketio');
    const recipient = await User.findById(req.user.id);
    const onlineUsers = req.app.get('onlineUsers');

    scoredDonors.forEach(donor => {
      console.log(`- ${donor.displayName} (${donor.email}) - Score: ${donor.availability_score}`);
      
      const donorSocketId = onlineUsers.get(donor._id.toString());
      if (donorSocketId) {
        console.log(`Sending real-time notification to donor: ${donor.displayName}`);
        io.to(donorSocketId).emit("getNotification", {
          message: `Urgent request for ${bloodType} blood from ${recipient.displayName} in ${recipient.city}!`,
        });
      }
    });

    // --- SANITIZE DONOR DATA before sending to frontend ---
    const sanitizedDonors = scoredDonors.map(donor => ({
      id: donor._id,
      displayName: donor.displayName,
      city: donor.city,
      state: donor.state,
      phone: donor.phone,
      availability_score: donor.availability_score,
    }));

    // --- SANITIZE BLOOD BANK DATA before sending to frontend ---
    const sanitizedBloodBanks = bloodBanks.map(bank => ({
      id: bank._id,
      name: bank.name,
      city: bank.city,
      state: bank.state,
      contactPhone: bank.contactPhone,
    }));

    // 4. Send response with BOTH donors and blood banks
    res.status(201).json({ 
      message: `Request created. Found ${sanitizedDonors.length} donors and ${sanitizedBloodBanks.length} blood banks in your area.`,
      request: newRequest,
      donors: sanitizedDonors,
      bloodBanks: sanitizedBloodBanks
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
    const donor = await User.findById(req.user.id);
    if (!donor || !donor.donorProfile || !donor.donorProfile.bloodType) {
      return res.json([]);
    }

    const searchRadius = 20000; // 20 kilometers
    const relevantRequests = await BloodRequest.find({
      'bloodType': donor.donorProfile.bloodType,
      'isFulfilled': false,
      'recipient': { $ne: req.user.id },
      'location': {
        $near: {
          $geometry: donor.location,
          $maxDistance: searchRadius,
        },
      },
      // --- NEW FILTER ADDED ---
      // Exclude requests where the donor's ID is already in the 'respondedBy' array
      'respondedBy': { $nin: [req.user.id] }
    })
    .populate('recipient', 'displayName city state')
    .sort({ createdAt: -1 });

    res.json(relevantRequests);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/requests/:requestId/respond
// @desc    A donor accepts or declines a blood request
// @access  Private
router.post('/:requestId/respond', auth, async (req, res) => {
  const { status } = req.body; // 'accepted' or 'unavailable'
  const { requestId } = req.params;
  const donorId = req.user.id;

  if (!['accepted', 'unavailable'].includes(status)) {
    return res.status(400).json({ msg: 'Invalid status provided.' });
  }

  try {
    // Log that this user has now responded to this request
    await BloodRequest.findByIdAndUpdate(requestId, {
      $push: { respondedBy: donorId }
    });

    // 1. Update the donor's history with their response
    await User.findByIdAndUpdate(donorId, {
      $push: { 'donorProfile.donationHistory': { status: status, date: new Date() } }
    });

    // 2. If the donor accepted, notify the recipient in real-time
    if (status === 'accepted') {
      const request = await BloodRequest.findById(requestId);
      if (!request) {
        return res.status(404).json({ msg: 'Request not found' });
      }

      const recipientId = request.recipient.toString();
      const donor = await User.findById(donorId).select('displayName phone');

      const io = req.app.get('socketio');
      const onlineUsers = req.app.get('onlineUsers');
      const recipientSocketId = onlineUsers.get(recipientId);

      if (recipientSocketId) {
        io.to(recipientSocketId).emit("acceptance-notification", {
          donorName: donor.displayName,
          donorPhone: donor.phone,
        });
      }
    }

    res.json({ msg: 'Response recorded successfully.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;