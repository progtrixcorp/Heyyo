const Message = require('../models/Message');
const encryptionService = require('./encryptionService');

exports.getMessagesBetweenUsers = async (userId1, userId2) => {
  const messages = await Message.find({
    $or: [
      { sender: userId1, receiver: userId2 },
      { sender: userId2, receiver: userId1 }
    ]
  }).sort('timestamp');

  return messages.map(msg => ({
    ...msg._doc,
    content: require('./encryptionService').decryptMessage(msg.content)
  }));
};

exports.getMessagesWithUser = async (req, res) => {
  const { withUserId } = req.params;
  try {
    const messages = await exports.getMessagesBetweenUsers(req.userId, withUserId);
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching messages');
  }
};
