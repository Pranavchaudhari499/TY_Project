// backend/routes/bloodBankAdmin.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const BloodBank = require('../models/bloodBank');
const User = require('../models/user');
const Groq = require('groq-sdk');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
let groq;

if (GROQ_API_KEY) {
  try {
    groq = new Groq({ apiKey: GROQ_API_KEY });
    console.log('✅ Groq client initialized for blood bank admin');
  } catch (initError) {
    console.error('❌ Error initializing Groq client:', initError);
  }
}

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

// @route   POST /api/blood-bank-admin/confirm-donation
// @desc    Confirm a donation from a registered donor
// @access  Private, Bloodbank_Admin
router.post('/confirm-donation', [auth, isBloodBankAdmin], async (req, res) => {
    const { userId } = req.body; // The ID of the donor who donated

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ msg: 'Donor not found' });
        }

        // Update the user's history and last donation date
        const newHistoryEntry = { status: 'donated', date: new Date() };
        user.donorProfile.donationHistory.push(newHistoryEntry);
        user.donorProfile.lastDonatedOn = new Date();

        await user.save();

        res.json({ msg: 'Donation confirmed successfully.', user });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/blood-bank-admin/analyze-report
// @desc    Analyze blood report using Groq AI
// @access  Private, Bloodbank_Admin
router.post('/analyze-report', [auth, isBloodBankAdmin], async (req, res) => {
  try {
    const { reportUrl, userId } = req.body;

    if (!reportUrl) {
      return res.status(400).json({ msg: 'Report URL is required' });
    }

    if (!userId) {
      return res.status(400).json({ msg: 'User ID is required' });
    }

    if (!groq) {
      return res.status(500).json({ msg: 'AI service is not available' });
    }

    // Prepare prompt for Groq AI
    const analysisPrompt = `
      Analyze this blood report and extract the following information in valid JSON format only:
      {
        "bloodType": "extracted blood type (A+, A-, B+, B-, AB+, AB-, O+, O-)",
        "hemoglobin": {"value": number, "unit": "g/dL", "status": "normal/low/high"},
        "platelets": {"value": number, "unit": "cells/μL", "status": "normal/low/high"},
        "rbc": {"value": number, "unit": "million/μL", "status": "normal/low/high"},
        "wbc": {"value": number, "unit": "cells/μL", "status": "normal/low/high"},
        "eligibility": "eligible/not_eligible",
        "summary": "brief summary of findings",
        "notes": "any important observations"
      }
      
      Use standard medical ranges for assessment:
      - Hemoglobin: Male 13.8-17.2 g/dL, Female 12.1-15.1 g/dL
      - Platelets: 150,000-450,000 cells/μL
      - RBC: Male 4.7-6.1 million/μL, Female 4.2-5.4 million/μL
      - WBC: 4,500-11,000 cells/μL
      
      For eligibility determination:
      - Consider hemoglobin levels primarily (must be adequate for donation)
      - Consider overall health markers
      - Return "eligible" only if all parameters are within acceptable donation ranges
      
      IMPORTANT: Return ONLY valid JSON format, no additional text or explanations.
    `;

    // Call Groq API for analysis
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a medical laboratory analyst. Extract blood report data and return ONLY valid JSON format. Do not include any additional text, explanations, or markdown formatting."
        },
        {
          role: "user",
          content: `Blood Report Analysis Request: ${analysisPrompt}\n\nReport URL for context: ${reportUrl}`
        }
      ],
      model: "llama3-8b-8192",
      temperature: 0.1, // Lower temperature for more consistent JSON output
      max_tokens: 1000,
      stream: false
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response received from AI analysis');
    }

    // Parse the JSON response
    let analysisResult;
    try {
      analysisResult = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('JSON Parse Error:', aiResponse);
      throw new Error('Failed to parse AI analysis response');
    }

    // Store analysis result in database
    const updatedBank = await BloodBank.findOneAndUpdate(
      { 
        admin: req.user.id,
        'pendingRegistrations.user': userId
      },
      {
        $set: {
          'pendingRegistrations.$.aiAnalysis': analysisResult,
          'pendingRegistrations.$.analyzedAt': new Date()
        }
      },
      { new: true }
    );

    if (!updatedBank) {
      return res.status(404).json({ msg: 'Pending registration not found for this user' });
    }

    // Also update the user's blood type if detected from analysis
    if (analysisResult.bloodType && analysisResult.bloodType !== 'unknown') {
      await User.findByIdAndUpdate(userId, {
        $set: {
          'donorProfile.bloodType': analysisResult.bloodType
        }
      });
    }

    res.json({ 
      msg: 'Blood report analyzed successfully',
      analysis: analysisResult,
      updatedDonorProfile: analysisResult.bloodType ? { bloodType: analysisResult.bloodType } : null
    });

  } catch (err) {
    console.error('AI Analysis Error:', err.message);
    
    // Specific error handling
    if (err.message.includes('API key') || err.message.includes('authentication')) {
      return res.status(500).json({ 
        msg: 'AI service configuration error',
        error: 'Invalid API configuration'
      });
    } else if (err.message.includes('parse')) {
      return res.status(500).json({ 
        msg: 'Failed to process AI analysis results',
        error: 'Analysis format error'
      });
    } else {
      return res.status(500).json({ 
        msg: 'Failed to analyze blood report',
        error: err.message 
      });
    }
  }
});

// @route   GET /api/blood-bank-admin/pending-with-analysis
// @desc    Get pending registrations with AI analysis results
// @access  Private, Bloodbank_Admin
router.get('/pending-with-analysis', [auth, isBloodBankAdmin], async (req, res) => {
  try {
    const bank = await BloodBank.findOne({ admin: req.user.id })
      .populate('pendingRegistrations.user', 'displayName email phone gender dateOfBirth donorProfile')
      .select('pendingRegistrations');

    if (!bank) {
      return res.status(404).json({ msg: 'Blood bank not found' });
    }

    // Filter and format pending registrations with analysis data
    const pendingWithAnalysis = bank.pendingRegistrations.map(reg => ({
      user: reg.user,
      bloodReport: reg.bloodReport,
      cloudinaryId: reg.cloudinaryId,
      uploadedAt: reg.uploadedAt,
      aiAnalysis: reg.aiAnalysis,
      analyzedAt: reg.analyzedAt,
      status: reg.aiAnalysis ? 'analyzed' : 'pending_analysis'
    }));

    res.json({
      totalPending: pendingWithAnalysis.length,
      analyzed: pendingWithAnalysis.filter(reg => reg.aiAnalysis).length,
      pendingAnalysis: pendingWithAnalysis.filter(reg => !reg.aiAnalysis).length,
      registrations: pendingWithAnalysis
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;