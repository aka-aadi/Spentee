const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const UPIPayment = require('../models/UPIPayment');

// Get all UPI payments
router.get('/', authenticate, async (req, res) => {
  try {
    // Admin users can see all UPI payments, regular users see only their own
    const query = req.user.role === 'admin' ? {} : { userId: req.user._id };
    const upiPayments = await UPIPayment.find(query)
      .lean() // Use lean() for read-only queries - much faster
      .sort({ date: -1 });
    res.json(upiPayments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching UPI payments', error: error.message });
  }
});

// Get UPI payment by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Admin users can see any UPI payment, regular users see only their own
    const query = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user._id };
    const upiPayment = await UPIPayment.findOne(query);
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
    // Admin users can update any UPI payment, regular users can only update their own
    const query = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user._id };
    const upiPayment = await UPIPayment.findOneAndUpdate(
      query,
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
    // Admin users can delete any UPI payment, regular users can only delete their own
    const query = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user._id };
    const upiPayment = await UPIPayment.findOneAndDelete(query);
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
    // Admin users can see all UPI payments, regular users see only their own
    const query = req.user.role === 'admin' ? {} : { userId: req.user._id };
    
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // Use aggregation for faster calculation
    const [upiPayments, appTotals, categoryTotals, totalResult] = await Promise.all([
      UPIPayment.find(query).lean(),
      UPIPayment.aggregate([
        { $match: query },
        { $group: { _id: '$upiApp', total: { $sum: '$amount' } } }
      ]),
      UPIPayment.aggregate([
        { $match: query },
        { $group: { _id: '$category', total: { $sum: '$amount' } } }
      ]),
      UPIPayment.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);
    
    const total = totalResult.length > 0 ? totalResult[0].total : 0;
    const byApp = appTotals.reduce((acc, item) => {
      acc[item._id] = item.total;
      return acc;
    }, {});
    const byCategory = categoryTotals.reduce((acc, item) => {
      acc[item._id] = item.total;
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


