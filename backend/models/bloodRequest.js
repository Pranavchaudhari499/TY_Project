// server/models/bloodRequest.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BloodRequestSchema = new Schema({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  bloodType: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  isFulfilled: { type: Boolean, default: false },
}, { timestamps: true });

BloodRequestSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('BloodRequest', BloodRequestSchema);