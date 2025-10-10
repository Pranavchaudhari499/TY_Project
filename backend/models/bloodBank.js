// backend/models/bloodBank.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BloodBankSchema = new Schema({
  name: { type: String, required: true },
  contactPhone: { type: String, required: true },
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
    'A+': { type: Number, default: 0 }, 
    'A-': { type: Number, default: 0 },
    'B+': { type: Number, default: 0 }, 
    'B-': { type: Number, default: 0 },
    'AB+': { type: Number, default: 0 }, 
    'AB-': { type: Number, default: 0 },
    'O+': { type: Number, default: 0 }, 
    'O-': { type: Number, default: 0 },
  },
  // Users who have applied to be donors for this bank
  pendingRegistrations: [{ 
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bloodReport: { type: String }, // Cloudinary URL (new field)
    cloudinaryId: { type: String }, // Cloudinary public ID (new field)
    reportUrl: { type: String }, // Legacy field for backward compatibility
    reportPublicId: { type: String }, // Legacy field for backward compatibility
    uploadedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    aiAnalysis: { 
      bloodType: String,
      eligibility: { type: String, enum: ['eligible', 'ineligible'], default: 'eligible' },
      hemoglobin: {
        value: Number,
        unit: String,
        status: String
      },
      platelets: {
        value: Number,
        unit: String,
        status: String
      },
      wbc: {
        value: Number,
        unit: String,
        status: String
      },
      summary: String,
      notes: String,
      confidence: Number
    },
    analyzedAt: Date,
    // Additional donor information at time of application (for historical reference)
    applicationData: {
      bloodType: String,
      weight: Number,
      age: Number,
      healthConditions: [String]
    }
  }],
  // Approved donors
  registeredDonors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  
  // Additional fields for enhanced functionality
  isActive: { type: Boolean, default: true },
  operatingHours: {
    open: String,
    close: String,
    timezone: { type: String, default: 'UTC' }
  },
  facilities: [String], // e.g., ['parking', 'wheelchair', 'canteen']
  ratings: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total blood units available
BloodBankSchema.virtual('totalStock').get(function() {
  return Object.values(this.stock).reduce((total, count) => total + count, 0);
});

// Virtual for critical blood types (low stock)
BloodBankSchema.virtual('criticalStock').get(function() {
  const critical = {};
  Object.entries(this.stock).forEach(([bloodType, count]) => {
    if (count < 3) { // Consider less than 3 units as critical
      critical[bloodType] = count;
    }
  });
  return critical;
});

// Index for geospatial queries
BloodBankSchema.index({ location: '2dsphere' });

// Index for common queries
BloodBankSchema.index({ city: 1, state: 1 });
BloodBankSchema.index({ admin: 1 });
BloodBankSchema.index({ 'pendingRegistrations.user': 1 });
BloodBankSchema.index({ 'registeredDonors': 1 });

// Static method to find blood banks by location
BloodBankSchema.statics.findNearby = function(longitude, latitude, maxDistance = 10000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance // in meters
      }
    },
    isActive: true
  });
};

// Instance method to add pending registration
BloodBankSchema.methods.addPendingRegistration = function(userId, bloodReportData = {}) {
  const registration = {
    user: userId,
    bloodReport: bloodReportData.url,
    cloudinaryId: bloodReportData.publicId,
    reportUrl: bloodReportData.url, // Legacy support
    reportPublicId: bloodReportData.publicId, // Legacy support
    uploadedAt: new Date(),
    applicationData: bloodReportData.applicationData || {}
  };
  
  this.pendingRegistrations.push(registration);
  return this.save();
};

// Instance method to approve registration
BloodBankSchema.methods.approveRegistration = async function(userId) {
  const registration = this.pendingRegistrations.find(reg => 
    reg.user && reg.user.toString() === userId
  );
  
  if (!registration) {
    throw new Error('Registration request not found');
  }
  
  // Remove from pending
  this.pendingRegistrations = this.pendingRegistrations.filter(reg => 
    reg.user.toString() !== userId
  );
  
  // Add to registered donors if not already there
  if (!this.registeredDonors.includes(userId)) {
    this.registeredDonors.push(userId);
  }
  
  // Update stock if blood type is known
  if (registration.aiAnalysis?.bloodType) {
    const bloodType = registration.aiAnalysis.bloodType;
    if (this.stock[bloodType] !== undefined) {
      this.stock[bloodType] += 1;
    }
  }
  
  return this.save();
};

// Instance method to reject registration
BloodBankSchema.methods.rejectRegistration = function(userId) {
  this.pendingRegistrations = this.pendingRegistrations.filter(reg => 
    reg.user.toString() !== userId
  );
  return this.save();
};

// Instance method to update AI analysis
BloodBankSchema.methods.updateAIAnalysis = function(userId, analysisData) {
  const registration = this.pendingRegistrations.find(reg => 
    reg.user && reg.user.toString() === userId
  );
  
  if (registration) {
    registration.aiAnalysis = analysisData;
    registration.analyzedAt = new Date();
    return this.save();
  }
  
  throw new Error('Registration not found for AI analysis update');
};

// Middleware to ensure stock is always an object
BloodBankSchema.pre('save', function(next) {
  // Ensure stock has all blood types
  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  bloodTypes.forEach(type => {
    if (this.stock[type] === undefined || this.stock[type] === null) {
      this.stock[type] = 0;
    }
  });
  next();
});

module.exports = mongoose.models.BloodBank || mongoose.model('BloodBank', BloodBankSchema);