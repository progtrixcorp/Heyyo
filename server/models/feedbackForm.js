const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
  },
  
  feedback: {
    type: String,
    required: [true, 'Feedback message is required'],
    trim: true,
    minlength: [10, 'Feedback must be at least 10 characters long'],
    maxlength: [1000, 'Feedback cannot exceed 1000 characters']
  },
  
  time: {
    type: Date,
    default: Date.now,
    required: true
  },

}, {
  timestamps: true
});

module.exports = mongoose.model('Feedback', feedbackSchema);