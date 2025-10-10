// backend/routes/bloodBanks.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // Import mongoose for transactions
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const User = require('../models/user');
const BloodBank = require('../models/bloodBank');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// Check Cloudinary configuration
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ Cloudinary environment variables are missing!');
} else {
  console.log('✅ Cloudinary configured');
}

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware to check if user is blood bank admin
const isBloodBankAdmin = async (req, res, next) => {
  try {
    const bloodBank = await BloodBank.findOne({ admin: req.user.id });
    if (!bloodBank) {
      return res.status(403).json({ msg: 'Access denied. Blood bank admin only.' });
    }
    next();
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

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
  const { bankName, city, state, adminName, email, password, location, bankPhone, adminPhone } = req.body;
 
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
      phone: adminPhone,
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
      contactPhone: bankPhone,
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
      .populate('pendingRegistrations.user', 'displayName email phone city state donorProfile bloodReport aiAnalysis analyzedAt')
      .populate('registeredDonors', 'displayName email city donorProfile lastDonatedOn');

    if (!bloodBank) {
      return res.status(404).json({ msg: 'Blood bank not found for this admin.' });
    }

    res.json(bloodBank);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- UPDATED REGISTRATION REQUEST WITH FILE UPLOAD ROUTE ---
// @route    POST /api/blood-banks/:id/register-request
// @desc     A user requests to register with a specific blood bank with blood report upload
// @access   Private
router.post('/:id/register-request', [auth, upload.single('bloodReport')], async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ msg: 'Blood report is required' });
    }

    const bank = await BloodBank.findById(id);
    if (!bank) {
      // Clean up temporary file if bank not found
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ msg: 'Blood bank not found' });
    }

    // Check if user already has a pending request or is already registered
    const existingRequest = bank.pendingRegistrations.some(reg => 
      reg.user && reg.user.toString() === req.user.id
    );
    
    if (existingRequest || bank.registeredDonors.includes(req.user.id)) {
      // Clean up temporary file if duplicate request
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ msg: 'You have already sent a request to this bank.' });
    }

    // Upload to Cloudinary
    let result;
    try {
      result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'blood-reports',
        resource_type: 'auto'
      });
    } catch (cloudinaryError) {
      console.error('Cloudinary upload error:', cloudinaryError);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({ msg: 'Failed to upload blood report to cloud storage.' });
    }

    // Store in database with Cloudinary URL
    const registrationData = {
      user: req.user.id,
      bloodReport: result.secure_url,
      cloudinaryId: result.public_id,
      uploadedAt: new Date(),
      status: 'pending'
    };

    const updatedBank = await BloodBank.findByIdAndUpdate(
      id,
      { 
        $push: { 
          pendingRegistrations: registrationData
        } 
      },
      { new: true }
    ).populate('pendingRegistrations.user', 'displayName email phone donorProfile');

    // Update user's pending bank request
    await User.findByIdAndUpdate(req.user.id, { 
      $set: { pendingBankRequest: id } 
    });

    // Clean up temporary file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({ 
      msg: 'Registration request submitted successfully with blood report',
      bank: updatedBank 
    });

  } catch (err) {
    // Clean up temporary file in case of error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Registration request error:', err);
    res.status(500).json({ 
      msg: 'Server error during registration request',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// --- KEEPING OLD ROUTE FOR BACKWARD COMPATIBILITY (COMMENTED OUT AS REQUESTED) ---
/*
// @route    POST /api/blood-banks/:bankId/register-request
// @desc     A user requests to register with a specific blood bank (without file upload)
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
    if (bank.pendingRegistrations.some(reg => reg.user && reg.user.toString() === userId) || bank.registeredDonors.includes(userId)) {
      return res.status(400).json({ msg: 'You have already sent a request to this bank.' });
    }

    bank.pendingRegistrations.push({ user: userId });
    await bank.save();

    await User.findByIdAndUpdate(userId, { $set: { pendingBankRequest: bankId } });

    res.json({ msg: 'Your request has been sent to the blood bank for approval.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
*/

// --- KEEPING OLD REGISTRATION REQUEST WITH FILE UPLOAD ROUTE FOR BACKWARD COMPATIBILITY ---
// @route    POST /api/blood-banks/:id/register-request-with-report
// @desc     A user requests to register with a specific blood bank with blood report upload
// @access   Private
router.post('/:id/register-request-with-report', [auth, upload.single('bloodReport')], async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ msg: 'Blood report is required' });
    }

    const bank = await BloodBank.findById(id);
    if (!bank) {
      // Clean up temporary file if bank not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ msg: 'Blood bank not found' });
    }

    // Check if user already has a pending request or is already registered
    const existingRequest = bank.pendingRegistrations.some(reg => 
      reg.user && reg.user.toString() === req.user.id
    );
    
    if (existingRequest || bank.registeredDonors.includes(req.user.id)) {
      // Clean up temporary file if duplicate request
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ msg: 'You have already sent a request to this bank.' });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'blood-reports',
      resource_type: 'auto' // Handles both images and PDFs
    });

    // Store in database with Cloudinary URL
    const updatedBank = await BloodBank.findByIdAndUpdate(
      id,
      { 
        $push: { 
          pendingRegistrations: {
            user: req.user.id,
            bloodReport: result.secure_url, // Cloudinary URL
            cloudinaryId: result.public_id,
            uploadedAt: new Date()
          }
        } 
      },
      { new: true }
    ).populate('pendingRegistrations.user', 'displayName email phone donorProfile');

    // Update user's pending bank request
    await User.findByIdAndUpdate(req.user.id, { $set: { pendingBankRequest: id } });

    // Clean up temporary file
    fs.unlinkSync(req.file.path);

    res.json({ 
      msg: 'Registration request submitted with blood report',
      bank: updatedBank 
    });

  } catch (err) {
    // Clean up temporary file in case of error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET /api/blood-banks/:id/pending-requests
// @desc     Get pending registration requests for a blood bank (with file support)
// @access   Private, Bloodbank_Admin-only
router.get('/:id/pending-requests', auth, async (req, res) => {
  try {
    const bloodBank = await BloodBank.findById(req.params.id)
      .populate('pendingRegistrations.user', 'displayName email phone city state donorProfile');

    if (!bloodBank) {
      return res.status(404).json({ msg: 'Blood bank not found' });
    }

    // Check if user is the admin of this blood bank
    if (bloodBank.admin.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied. Not the admin of this blood bank.' });
    }

    res.json(bloodBank.pendingRegistrations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST /api/blood-banks/:id/approve-request/:userId
// @desc     Approve a user's registration request
// @access   Private, Bloodbank_Admin-only
router.post('/:id/approve-request/:userId', auth, async (req, res) => {
  try {
    const { id, userId } = req.params;

    const bloodBank = await BloodBank.findById(id);
    if (!bloodBank) {
      return res.status(404).json({ msg: 'Blood bank not found' });
    }

    // Check if user is the admin of this blood bank
    if (bloodBank.admin.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied. Not the admin of this blood bank.' });
    }

    // Remove from pending and add to registered donors
    await BloodBank.findByIdAndUpdate(id, {
      $pull: { pendingRegistrations: { user: userId } },
      $addToSet: { registeredDonors: userId }
    });

    // Update user's status
    await User.findByIdAndUpdate(userId, {
      $unset: { pendingBankRequest: "" },
      $set: { registeredBloodBank: id }
    });

    res.json({ msg: 'User registration approved successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST /api/blood-banks/:id/reject-request/:userId
// @desc     Reject a user's registration request
// @access   Private, Bloodbank_Admin-only
router.post('/:id/reject-request/:userId', auth, async (req, res) => {
  try {
    const { id, userId } = req.params;

    const bloodBank = await BloodBank.findById(id);
    if (!bloodBank) {
      return res.status(404).json({ msg: 'Blood bank not found' });
    }

    // Check if user is the admin of this blood bank
    if (bloodBank.admin.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied. Not the admin of this blood bank.' });
    }

    // Remove from pending registrations
    await BloodBank.findByIdAndUpdate(id, {
      $pull: { pendingRegistrations: { user: userId } }
    });

    // Update user's status
    await User.findByIdAndUpdate(userId, {
      $unset: { pendingBankRequest: "" }
    });

    res.json({ msg: 'User registration rejected' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- NEW BLOOD BANK ADMIN ROUTES ---

// @route   POST /api/blood-bank-admin/registrations/:userId/approve
// @desc    Approve a donor's registration request
// @access  Private, Bloodbank_Admin
router.post('/blood-bank-admin/registrations/:userId/approve', [auth, isBloodBankAdmin], async (req, res) => {
  try {
    const applicantId = req.params.userId;
    const bank = await BloodBank.findOne({ admin: req.user.id });
    
    if (!bank) {
      return res.status(404).json({ msg: 'Blood bank not found.' });
    }

    // Check if user exists in pending registrations (using the user field)
    const pendingRequest = bank.pendingRegistrations.find(reg => 
      reg.user && reg.user.toString() === applicantId
    );

    if (!pendingRequest) {
      return res.status(404).json({ msg: 'Registration request not found.' });
    }

    // Move user from pending to registered
    bank.pendingRegistrations = bank.pendingRegistrations.filter(reg => 
      reg.user.toString() !== applicantId
    );
    bank.registeredDonors.push(applicantId);
    
    // Update the blood bank's stock
    const applicant = await User.findById(applicantId);
    const bloodType = applicant.donorProfile?.bloodType;
    if (bloodType && bank.stock && bank.stock.hasOwnProperty(bloodType)) {
      bank.stock[bloodType] += 1;
    }

    await bank.save();
    
    // Update the user's profile to link them to this bank
    applicant.bloodBank = bank._id;
    applicant.pendingBankRequest = null; // Clear the pending request
    await applicant.save();

    // Send back updated bank data with populated fields
    const updatedBank = await BloodBank.findById(bank._id)
      .populate('pendingRegistrations.user', 'displayName email phone city state donorProfile bloodReport aiAnalysis analyzedAt')
      .populate('registeredDonors', 'displayName email city donorProfile lastDonatedOn');

    res.json(updatedBank);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/blood-bank-admin/registrations/:userId/reject
// @desc    Reject a donor's registration request
// @access  Private, Bloodbank_Admin
router.post('/blood-bank-admin/registrations/:userId/reject', [auth, isBloodBankAdmin], async (req, res) => {
  try {
    const applicantId = req.params.userId;
    const bank = await BloodBank.findOne({ admin: req.user.id });

    if (!bank) {
      return res.status(404).json({ msg: 'Blood bank not found.' });
    }

    // Check if user exists in pending registrations (using the user field)
    const pendingRequest = bank.pendingRegistrations.find(reg => 
      reg.user && reg.user.toString() === applicantId
    );

    if (!pendingRequest) {
      return res.status(404).json({ msg: 'Registration request not found.' });
    }
    
    // Remove the user from the pending list
    bank.pendingRegistrations = bank.pendingRegistrations.filter(reg => 
      reg.user.toString() !== applicantId
    );
    await bank.save();

    // Also clear the user's pending status
    await User.findByIdAndUpdate(applicantId, { $set: { pendingBankRequest: null } });

    // Send back updated bank data with populated fields
    const updatedBank = await BloodBank.findById(bank._id)
      .populate('pendingRegistrations.user', 'displayName email phone city state donorProfile bloodReport aiAnalysis analyzedAt')
      .populate('registeredDonors', 'displayName email city donorProfile lastDonatedOn');

    res.json(updatedBank);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/blood-bank-admin/confirm-donation
// @desc    Confirm a donation for a registered donor
// @access  Private, Bloodbank_Admin
// @route   POST /api/blood-banks/blood-bank-admin/confirm-donation
// @desc    Confirm a donation for a registered donor
// @access  Private, Bloodbank_Admin
router.post('/blood-bank-admin/confirm-donation', [auth, isBloodBankAdmin], async (req, res) => {
  try {
    const { userId } = req.body;
    const bank = await BloodBank.findOne({ admin: req.user.id });

    if (!bank) {
      return res.status(404).json({ msg: 'Blood bank not found.' });
    }

    // Check if user is a registered donor
    if (!bank.registeredDonors.includes(userId)) {
      return res.status(400).json({ msg: 'User is not a registered donor.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    // Check if user is eligible to donate (optional - based on your business rules)
    const lastDonation = user.donorProfile?.lastDonatedOn;
    if (lastDonation) {
      const daysSinceLastDonation = Math.floor((new Date() - new Date(lastDonation)) / (1000 * 60 * 60 * 24));
      if (daysSinceLastDonation < 56) { // 8 weeks minimum between donations
        return res.status(400).json({ 
          msg: 'User is not eligible to donate yet. Minimum 8 weeks required between donations.',
          daysSinceLastDonation 
        });
      }
    }

    // Update user's donation history and last donation date
    if (!user.donorProfile) {
      user.donorProfile = {};
    }
    
    // Initialize donationHistory if it doesn't exist
    if (!user.donorProfile.donationHistory) {
      user.donorProfile.donationHistory = [];
    }
    
    // Add new donation record
    const newDonation = {
      date: new Date(),
      bloodBank: bank._id,
      bloodBankName: bank.name,
      status: 'completed',
      bloodType: user.donorProfile.bloodType
    };
    
    user.donorProfile.donationHistory.push(newDonation);
    user.donorProfile.lastDonatedOn = new Date();
    
    // Update total donations count
    user.donorProfile.totalDonations = (user.donorProfile.totalDonations || 0) + 1;
    
    // Update next eligible donation date (optional)
    user.donorProfile.nextEligibleDonation = new Date(Date.now() + (56 * 24 * 60 * 60 * 1000)); // 56 days from now
    
    await user.save();

    // Update blood bank stock
    const bloodType = user.donorProfile.bloodType;
    if (bloodType && bank.stock && bank.stock.hasOwnProperty(bloodType)) {
      bank.stock[bloodType] += 1;
      
      // Update blood bank's donation statistics
      if (!bank.donationStatistics) {
        bank.donationStatistics = {
          totalDonations: 0,
          donationsThisMonth: 0,
          lastUpdated: new Date()
        };
      }
      
      bank.donationStatistics.totalDonations += 1;
      const now = new Date();
      if (now.getMonth() === new Date(bank.donationStatistics.lastUpdated).getMonth()) {
        bank.donationStatistics.donationsThisMonth += 1;
      } else {
        bank.donationStatistics.donationsThisMonth = 1;
      }
      bank.donationStatistics.lastUpdated = now;
      
      await bank.save();
    }

    res.json({ 
      msg: 'Donation confirmed successfully', 
      user: await User.findById(userId).select('displayName email donorProfile'),
      donation: newDonation,
      nextEligibleDonation: user.donorProfile.nextEligibleDonation
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/blood-bank-admin/analyze-report
// @desc    Analyze blood report using AI
// @access  Private, Bloodbank_Admin
router.post('/blood-bank-admin/analyze-report', [auth, isBloodBankAdmin], async (req, res) => {
  try {
    const { reportUrl, userId } = req.body;
    
    // TODO: Implement actual AI analysis logic here
    // For now, return mock analysis data
    const mockAnalysis = {
      bloodType: 'A+',
      eligibility: 'eligible',
      hemoglobin: {
        value: 14.5,
        unit: 'g/dL',
        status: 'normal'
      },
      platelets: {
        value: 250000,
        unit: '/μL',
        status: 'normal'
      },
      summary: 'Blood parameters within normal range. Donor is eligible for donation.',
      notes: 'No significant abnormalities detected.'
    };

    // Update user with AI analysis results
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          aiAnalysis: mockAnalysis,
          analyzedAt: new Date()
        }
      },
      { new: true }
    );

    res.json({ 
      msg: 'Report analyzed successfully', 
      analysis: mockAnalysis,
      user 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;