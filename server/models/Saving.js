const mongoose = require('mongoose');

const savingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Optional while data isolation is disabled
    required: false,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
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
  }
}, {
  timestamps: true
});

// Compound indexes for common query patterns
savingSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Saving', savingSchema);

