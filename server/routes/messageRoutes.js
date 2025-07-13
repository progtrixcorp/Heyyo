const express = require('express');
const router = express.Router();
const messageService = require('../services/messageService');

router.get('/api/messages/:userId1/:userId2', async (req, res) => {
  const { userId1, userId2 } = req.params;
  try {
    const messages = await messageService.getMessagesBetweenUsers(userId1, userId2);
    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;
