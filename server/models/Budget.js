const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Optional while data is shared and routes don't set userId
    required: false,
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Healthcare', 'Education', 'Other', 'Overall'],
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  period: {
    type: String,
    enum: ['Weekly', 'Monthly', 'Yearly'],
    default: 'Monthly'
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  endDate: {
    type: Date,
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for common query patterns
budgetSchema.index({ userId: 1, isActive: 1 });
budgetSchema.index({ userId: 1, category: 1, isActive: 1 });
budgetSchema.index({ category: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Budget', budgetSchema);


