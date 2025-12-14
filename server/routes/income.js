const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Income = require('../models/Income');

// Get all income
router.get('/', authenticate, async (req, res) => {
  try {
    // Admin users can see all income, regular users see only their own
    const query = req.user.role === 'admin' ? {} : { userId: req.user._id };
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    let incomeQuery = Income.find(query)
      .lean() // Use lean() for read-only queries - much faster
      .sort({ date: -1 });
    
    if (limit) {
      incomeQuery = incomeQuery.limit(limit);
    }
    
    const income = await incomeQuery;
    res.json(income);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching income', error: error.message });
  }
});

// Get income by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Admin users can see any income, regular users see only their own
    const query = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user._id };
    const income = await Income.findOne(query);
    if (!income) {
      return res.status(404).json({ message: 'Income not found' });
    }
    res.json(income);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching income', error: error.message });
  }
});

// Create income
router.post('/', authenticate, async (req, res) => {
  try {
    const income = new Income({
      ...req.body,
      userId: req.user._id
    });
    await income.save();
    res.status(201).json(income);
  } catch (error) {
    res.status(400).json({ message: 'Error creating income', error: error.message });
  }
});

// Update income
router.put('/:id', authenticate, async (req, res) => {
  try {
    // Admin users can update any income, regular users can only update their own
    const query = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user._id };
    const income = await Income.findOneAndUpdate(
      query,
      req.body,
      { new: true, runValidators: true }
    );
    if (!income) {
      return res.status(404).json({ message: 'Income not found' });
    }
    res.json(income);
  } catch (error) {
    res.status(400).json({ message: 'Error updating income', error: error.message });
  }
});

// Delete income
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // Admin users can delete any income, regular users can only delete their own
    const query = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user._id };
    const income = await Income.findOneAndDelete(query);
    if (!income) {
      return res.status(404).json({ message: 'Income not found' });
    }
    res.json({ message: 'Income deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting income', error: error.message });
  }
});

// Get income summary
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    // Admin users can see all income, regular users see only their own
    const query = req.user.role === 'admin' ? {} : { userId: req.user._id };
    
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // Use aggregation for faster calculation
    const [income, typeTotals] = await Promise.all([
      Income.find(query).lean(),
      Income.aggregate([
        { $match: query },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
      ])
    ]);
    
    const total = income.reduce((sum, inc) => sum + inc.amount, 0);
    const byType = typeTotals.reduce((acc, item) => {
      acc[item._id] = item.total;
      return acc;
    }, {});

    res.json({
      total,
      count: income.length,
      byType
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching summary', error: error.message });
  }
});

module.exports = router;


