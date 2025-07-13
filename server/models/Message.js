const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, encrypted: true },
  timestamp: { type: Date, default: Date.now },
  seen: { type: Boolean, default: false } // <-- add this line
});

module.exports = mongoose.model('Message', messageSchema);
