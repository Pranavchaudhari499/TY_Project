const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');

// @route   PUT /api/profile
// @desc    Create or update user profile
// @access  Private
router.put('/', auth, async (req, res) => {
    const { role, bloodType, phone, address, lastDonationDate, hospitalName } = req.body;

    const profileFields = {
        role,
        bloodType,
        phone,
        address,
        lastDonationDate,
        hospitalName
    };

    try {
        // Find user by ID from token and update their profile
        let user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: profileFields },
            { new: true, omitUndefined: true } // new:true returns the updated doc
        ).select('-password'); // Exclude password from the returned user object

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;