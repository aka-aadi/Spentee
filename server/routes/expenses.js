const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Expense = require('../models/Expense');

// Get all expenses
router.get('/', authenticate, async (req, res) => {
  try {
    // Admin users can see all expenses, regular users see only their own
    const query = req.user.role === 'admin' ? {} : { userId: req.user._id };
    const expenses = await Expense.find(query)
      .lean() // Use lean() for read-only queries - much faster
      .sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching expenses', error: error.message });
  }
});

// Get expense by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Admin users can see any expense, regular users see only their own
    const query = req.user.role === 'admin' 
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user._id };
    const expense = await Expense.findOne(query);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching expense', error: error.message });
  }
});

// Create expense
router.post('/', authenticate, async (req, res) => {
  try {
    const expense = new Expense({
      ...req.body,
      userId: req.user._id
    });
    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ message: 'Error creating expense', error: error.message });
  }
});

// Update expense
router.put('/:id', authenticate, async (req, res) => {
  try {
    // Admin users can update any expense, regular users can only update their own
    const query = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user._id };
    const expense = await Expense.findOneAndUpdate(
      query,
      req.body,
      { new: true, runValidators: true }
    );
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json(expense);
  } catch (error) {
    res.status(400).json({ message: 'Error updating expense', error: error.message });
  }
});

// Delete expense
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // Admin users can delete any expense, regular users can only delete their own
    const query = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user._id };
    const expense = await Expense.findOneAndDelete(query);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting expense', error: error.message });
  }
});

// Get expenses summary
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    // Admin users can see all expenses, regular users see only their own
    const query = req.user.role === 'admin' ? {} : { userId: req.user._id };
    
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // Use aggregation for faster calculation
    const [expenses, categoryTotals] = await Promise.all([
      Expense.find(query).lean(),
      Expense.aggregate([
        { $match: query },
        { $group: { _id: '$category', total: { $sum: '$amount' } } }
      ])
    ]);
    
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const byCategory = categoryTotals.reduce((acc, item) => {
      acc[item._id] = item.total;
      return acc;
    }, {});

    res.json({
      total,
      count: expenses.length,
      byCategory
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching summary', error: error.message });
  }
});

module.exports = router;


