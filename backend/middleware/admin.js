// backend/middleware/admin.js
const User = require('../models/user');

module.exports = async function (req, res, next) {
  try {
    // req.user.id is available from the preceding 'auth' middleware
    const user = await User.findById(req.user.id);

    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Forbidden: Access denied.' });
    }
    next();
  } catch (err) {
    res.status(500).send('Server Error');
  }
};