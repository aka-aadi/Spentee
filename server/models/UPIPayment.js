const mongoose = require('mongoose');

const upiPaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Success', 'Pending', 'Failed'],
    default: 'Success'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('UPIPayment', upiPaymentSchema);


