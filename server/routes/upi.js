const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const UPIPayment = require('../models/UPIPayment');

// Get all UPI payments
router.get('/', authenticate, async (req, res) => {
  try {
    const upiPayments = await UPIPayment.find({ userId: req.user._id }).sort({ date: -1 });
    res.json(upiPayments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching UPI payments', error: error.message });
  }
});

// Get UPI payment by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const upiPayment = await UPIPayment.findOne({ _id: req.params.id, userId: req.user._id });
    if (!upiPayment) {
      return res.status(404).json({ message: 'UPI payment not found' });
    }
    res.json(upiPayment);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching UPI payment', error: error.message });
  }
});

// Create UPI payment
router.post('/', authenticate, async (req, res) => {
  try {
    // Generate transaction ID if not provided
    if (!req.body.transactionId) {
      req.body.transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }
    
    const upiPayment = new UPIPayment({
      ...req.body,
      userId: req.user._id
    });
    await upiPayment.save();
    res.status(201).json(upiPayment);
  } catch (error) {
    res.status(400).json({ message: 'Error creating UPI payment', error: error.message });
  }
});

// Update UPI payment
router.put('/:id', authenticate, async (req, res) => {
  try {
    const upiPayment = await UPIPayment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!upiPayment) {
      return res.status(404).json({ message: 'UPI payment not found' });
    }
    res.json(upiPayment);
  } catch (error) {
    res.status(400).json({ message: 'Error updating UPI payment', error: error.message });
  }
});

// Delete UPI payment
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const upiPayment = await UPIPayment.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!upiPayment) {
      return res.status(404).json({ message: 'UPI payment not found' });
    }
    res.json({ message: 'UPI payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting UPI payment', error: error.message });
  }
});

// Get UPI payments summary
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { userId: req.user._id };
    
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const upiPayments = await UPIPayment.find(query);
    const total = upiPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    const byApp = upiPayments.reduce((acc, payment) => {
      acc[payment.upiApp] = (acc[payment.upiApp] || 0) + payment.amount;
      return acc;
    }, {});

    const byCategory = upiPayments.reduce((acc, payment) => {
      acc[payment.category] = (acc[payment.category] || 0) + payment.amount;
      return acc;
    }, {});

    res.json({
      total,
      count: upiPayments.length,
      byApp,
      byCategory
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching summary', error: error.message });
  }
});

module.exports = router;


