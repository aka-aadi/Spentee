const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Optional while data is shared and routes don't set userId
    required: false,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  source: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  type: {
    type: String,
    enum: ['Salary', 'Freelance', 'Investment', 'Business', 'Other'],
    default: 'Salary'
  }
}, {
  timestamps: true
});

// Compound indexes for common query patterns
incomeSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Income', incomeSchema);


