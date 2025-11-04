const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const UPIPayment = require('../models/UPIPayment');

// Get all budgets
router.get('/', authenticate, async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user._id, isActive: true }).sort({ createdAt: -1 });
    
    // Calculate spent amount for each budget (including expenses and UPI payments)
    const budgetsWithSpent = await Promise.all(budgets.map(async (budget) => {
      // Get expenses for this category and date range
      const expenses = await Expense.find({
        userId: req.user._id,
        category: budget.category,
        date: { $gte: budget.startDate, $lte: budget.endDate }
      });
      
      // Get UPI payments for this category and date range (only successful ones)
      const upiPayments = await UPIPayment.find({
        userId: req.user._id,
        category: budget.category,
        date: { $gte: budget.startDate, $lte: budget.endDate },
        status: 'Success'
      });
      
      // Calculate total spent from both expenses and UPI payments
      const expenseTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const upiTotal = upiPayments.reduce((sum, upi) => sum + upi.amount, 0);
      const spent = expenseTotal + upiTotal;
      
      return {
        ...budget.toObject(),
        spent,
        remaining: budget.amount - spent,
        percentageUsed: (spent / budget.amount) * 100
      };
    }));
    
    res.json(budgetsWithSpent);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching budgets', error: error.message });
  }
});

// Get budget by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, userId: req.user._id });
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }
    
    // Get expenses for this category and date range
    const expenses = await Expense.find({
      userId: req.user._id,
      category: budget.category,
      date: { $gte: budget.startDate, $lte: budget.endDate }
    });
    
    // Get UPI payments for this category and date range (only successful ones)
    const upiPayments = await UPIPayment.find({
      userId: req.user._id,
      category: budget.category,
      date: { $gte: budget.startDate, $lte: budget.endDate },
      status: 'Success'
    });
    
    // Calculate total spent from both expenses and UPI payments
    const expenseTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const upiTotal = upiPayments.reduce((sum, upi) => sum + upi.amount, 0);
    const spent = expenseTotal + upiTotal;
    
    res.json({
      ...budget.toObject(),
      spent,
      remaining: budget.amount - spent,
      percentageUsed: (spent / budget.amount) * 100
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching budget', error: error.message });
  }
});

// Create budget
router.post('/', authenticate, async (req, res) => {
  try {
    const budget = new Budget({
      ...req.body,
      userId: req.user._id
    });
    await budget.save();
    res.status(201).json(budget);
  } catch (error) {
    res.status(400).json({ message: 'Error creating budget', error: error.message });
  }
});

// Update budget
router.put('/:id', authenticate, async (req, res) => {
  try {
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }
    res.json(budget);
  } catch (error) {
    res.status(400).json({ message: 'Error updating budget', error: error.message });
  }
});

// Delete budget
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting budget', error: error.message });
  }
});

module.exports = router;
