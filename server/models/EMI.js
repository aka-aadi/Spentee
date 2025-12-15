const mongoose = require('mongoose');

const emiSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Optional while data isolation is disabled
    required: false,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  downPayment: {
    type: Number,
    default: 0,
    min: 0
  },
  principalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  monthlyEMI: {
    type: Number,
    required: true,
    min: 0
  },
  interestRate: {
    type: Number,
    required: true,
    min: 0
  },
  tenureMonths: {
    type: Number,
    required: true,
    min: 1
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  paidMonths: {
    type: Number,
    default: 0,
    min: 0
  },
  paidMonthDates: {
    type: [Date],
    default: []
  },
  remainingMonths: {
    type: Number,
    required: true,
    min: 0
  },
  nextDueDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  category: {
    type: String,
    enum: ['Home Loan', 'Car Loan', 'Personal Loan', 'Credit Card', 'Education Loan', 'Other'],
    default: 'Other'
  },
  includeDownPaymentInBalance: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound indexes for common query patterns
emiSchema.index({ userId: 1, isActive: 1 });
emiSchema.index({ userId: 1, nextDueDate: 1 });
emiSchema.index({ userId: 1, startDate: 1 });

module.exports = mongoose.model('EMI', emiSchema);
