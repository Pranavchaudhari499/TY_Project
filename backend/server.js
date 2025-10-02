const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const adminRoutes = require('./routes/admin');
const bloodBankRoutes = require('./routes/bloodBanks');
require('dotenv').config(); // Make sure to require dotenv at the top

const authRoutes = require('./routes/auth'); 
const userRoutes = require('./routes/users');
const requestRoutes = require('./routes/requests');
const bloodBankAdminRoutes = require('./routes/bloodBankAdmin');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/blood-banks', bloodBankRoutes);
app.use('/api/blood-bank-admin', bloodBankAdminRoutes);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ Connection error', err.message);
  });