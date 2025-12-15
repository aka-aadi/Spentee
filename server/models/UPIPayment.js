const mongoose = require('mongoose');

const upiPaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // NOTE:
    // We previously required userId for strict per-user data isolation.
    // Registration & isolation are currently disabled, and routes no longer
    // attach userId on create, which caused validation errors when saving.
    // Make this optional so UPI payments can be created/updated without userId.
    required: false
  },
  transactionId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  upiApp: {
    type: String,
    required: true,
    enum: ['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'Amazon Pay', 'Other']
  },
  recipientName: {
    type: String,
    trim: true
  },
  recipientUPI: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Healthcare', 'Education', 'Other']
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
  status: {
    type: String,
    enum: ['Success', 'Pending', 'Failed'],
    default: 'Success',
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for common query patterns
upiPaymentSchema.index({ userId: 1, date: -1 });
upiPaymentSchema.index({ userId: 1, status: 1, date: -1 });
upiPaymentSchema.index({ userId: 1, category: 1, date: -1 });
upiPaymentSchema.index({ category: 1, date: -1, status: 1 });

module.exports = mongoose.model('UPIPayment', upiPaymentSchema);


