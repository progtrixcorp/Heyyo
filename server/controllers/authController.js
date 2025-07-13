const authService = require('../services/authService');
const User = require('../models/User');
const Message = require('../models/Message');

exports.signup = authService.signup;
exports.login = authService.login;
exports.logout = authService.logout;
exports.feedback = authService.feedback;
exports.deleteAccount = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    if (!userId) {
      return res.status(400).json({ message: 'User ID not found in session' });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await Message.deleteMany({
      $or: [{ sender: userId }, { receiver: userId }]
    });

    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ message: 'Error during account deletion' });
      }
      res.json({ message: 'Account successfully deleted' });
    });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ message: 'Failed to delete account' });
  }
};
