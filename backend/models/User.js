// backend/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Basic info
  displayName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // For email/pass auth
  phone: { type: String, required: true },
  role: {
    type: String,
    enum: ['user', 'admin', 'bloodbank_admin'],  
    default: 'user'
  },

  // --- ADDED FIELD ---
  // If the user is an approved donor of a specific bank
  bloodBank: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodBank',
    default: null
  },
  pendingBankRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodBank',
    default: null
  },
  // --------------------

  city: { type: String, required: true },
  state: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  weight: { type: Number, required: true }, // Weight in kg, for eligibility

  // Geolocation for matching
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },

  // Donor-specific profile
  donorProfile: {
    bloodType: String,
    lastDonatedOn: Date,
    isAvailable: { type: Boolean, default: true }
  }
}, { timestamps: true });

// Create a 2dsphere index for geospatial queries
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);