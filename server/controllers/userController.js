const User = require('../models/User');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(401).json({ message: 'Not authenticated' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving profile' });
  }
};
