require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');

const Message = require('./models/Message');
const User = require('./models/User');
const authMiddleware = require('./middleware/authMiddleware');
const encryptionService = require('./services/encryptionService');

const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const userController = require('./controllers/userController');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: true,
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((req, res, next) => {
  if (req.session && req.session.user && req.session.user.id) {
    req.userId = req.session.user.id;
  }
  next();
});

app.use('/', authRoutes);
app.use('/', messageRoutes);
app.use('/', feedbackRoutes);

app.get('/profile', authMiddleware, userController.getProfile);

app.get('/api/users/name/:name', async (req, res) => {
  try {
    const searchName = req.params.name.trim();
    const user = await User.findOne({ 
      name: { $regex: new RegExp(`^${searchName}$`, 'i') }
    });
    
    if (user) {
      res.json({
        _id: user._id,
        name: user.name
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error while searching for user' });
  }
});

const onlineUsers = new Map();

io.on('connection', (socket) => {
  socket.on('user_connected', (userId) => {
    onlineUsers.set(userId, socket.id);
  });

  socket.on('private_message', async ({ from, to, content }) => {
    try {
      const encryptedContent = encryptionService.encryptMessage(content);
      const newMessage = new Message({
        sender: from,
        receiver: to,
        content: encryptedContent,
        seen: false
      });

      const savedMessage = await newMessage.save();

      // Notify sender
      socket.emit('message_sent', {
        id: savedMessage._id,
        content: content,
        timestamp: savedMessage.timestamp
      });

      // Notify receiver
      const toSocketId = onlineUsers.get(to);
      if (toSocketId) {
        io.to(toSocketId).emit('private_message', {
          sender: from,
          receiver: to,
          content: content,
          timestamp: savedMessage.timestamp,
          _id: savedMessage._id
        });
      } 
    } catch (err) {
      socket.emit('message_error', {
        message: 'Failed to save message',
        details: err.message
      });
    }
  });

  // Mark messages as seen when chat is opened
  socket.on('mark_seen', async ({ userId, contactId }) => {
    try {
      // Mark all messages from contactId to userId as seen
      const updated = await Message.updateMany(
        { sender: contactId, receiver: userId, seen: false },
        { $set: { seen: true } }
      );
      // Find the last message from contactId to userId
      const lastMsg = await Message.findOne(
        { sender: contactId, receiver: userId }
      ).sort({ timestamp: -1 });

      // Notify sender if online
      const senderSocketId = onlineUsers.get(contactId);
      if (senderSocketId && lastMsg) {
        io.to(senderSocketId).emit('message_seen', {
          messageId: lastMsg._id,
          receiver: userId
        });
      }
    } catch (err) {
      // Optionally log error
    }
  });

  socket.on('disconnect', () => {
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
