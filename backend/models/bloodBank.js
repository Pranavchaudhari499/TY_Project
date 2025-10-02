// backend/models/bloodBank.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BloodBankSchema = new Schema({
  name: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  // The user who manages this blood bank
  admin: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  // Live inventory of blood units
  stock: {
    'A+': { type: Number, default: 0 }, 'A-': { type: Number, default: 0 },
    'B+': { type: Number, default: 0 }, 'B-': { type: Number, default: 0 },
    'AB+': { type: Number, default: 0 }, 'AB-': { type: Number, default: 0 },
    'O+': { type: Number, default: 0 }, 'O-': { type: Number, default: 0 },
  },
  // Users who have applied to be donors for this bank
  pendingRegistrations: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  // Approved donors
  registeredDonors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

BloodBankSchema.index({ location: '2dsphere' });

module.exports = mongoose.models.BloodBank || mongoose.model('BloodBank', BloodBankSchema);