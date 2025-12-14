const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const UPIPayment = require('../models/UPIPayment');

// Get all UPI payments
router.get('/', authenticate, async (req, res) => {
  try {
    // All users see all UPI payments (shared data)
    const query = {};
    
    console.log(`[UPI GET] User: ${req.user._id} (${req.user.username}), Role: ${req.user.role}, Query: {} (shared data)`);
    
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    let upiQuery = UPIPayment.find(query)
      .lean() // Use lean() for read-only queries - much faster
      .sort({ date: -1 });
    
    if (limit) {
      upiQuery = upiQuery.limit(limit);
    }
    
    const upiPayments = await upiQuery;
    console.log(`[UPI GET] Found ${upiPayments.length} UPI payments (shared)`);
    res.json(upiPayments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching UPI payments', error: error.message });
  }
});

// Get UPI payment by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    // All users can see any UPI payment (shared data)
    const upiPayment = await UPIPayment.findById(req.params.id);
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
    // Remove userId from body - data is shared, userId is optional for tracking
    const { userId, ...paymentData } = req.body;
    
    // Generate transaction ID if not provided
    if (!paymentData.transactionId) {
      paymentData.transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }
    
    // Set userId for tracking who created it, but data is shared
    const upiPayment = new UPIPayment({
      ...paymentData,
      userId: req.user._id
    });
    
    console.log(`[UPI CREATE] User: ${req.user._id} (${req.user.username}), Role: ${req.user.role} (shared data)`);
    
    await upiPayment.save();
    res.status(201).json(upiPayment);
  } catch (error) {
    res.status(400).json({ message: 'Error creating UPI payment', error: error.message });
  }
});

// Update UPI payment
router.put('/:id', authenticate, async (req, res) => {
  try {
    // Remove userId from body - data is shared, any user can update
    const { userId, ...updateData } = req.body;
    
    console.log(`[UPI UPDATE] User: ${req.user._id} (${req.user.username}), Role: ${req.user.role} (shared data)`);
    
    const upiPayment = await UPIPayment.findByIdAndUpdate(
      req.params.id,
      updateData, // Use sanitized data without userId
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
    // All users can delete any UPI payment (shared data)
    console.log(`[UPI DELETE] User: ${req.user._id} (${req.user.username}), Role: ${req.user.role} (shared data)`);
    
    const upiPayment = await UPIPayment.findByIdAndDelete(req.params.id);
    if (!upiPayment) {
      return res.status(404).json({ message: 'UPI payment not found' });
    }
    console.log(`[UPI DELETE] Deleted UPI payment ${req.params.id}`);
    res.json({ message: 'UPI payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting UPI payment', error: error.message });
  }
});

// Get UPI payments summary
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    // All users see all UPI payments (shared data)
    const query = {};
    
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


