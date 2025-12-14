const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const UPIPayment = require('../models/UPIPayment');

// Get all budgets
router.get('/', authenticate, async (req, res) => {
  try {
    // Admin users can see all budgets, regular users see only their own
    const budgetQuery = req.user.role === 'admin' 
      ? { isActive: true }
      : { userId: req.user._id, isActive: true };
    
    // Fetch budgets with .lean() for better performance
    const budgets = await Budget.find(budgetQuery)
      .lean()
      .sort({ createdAt: -1 });
    
    if (budgets.length === 0) {
      return res.json([]);
    }
    
    // Use aggregation for MUCH faster calculation - calculate spent per budget using database aggregation
    // This is significantly faster than fetching all expenses/UPI and filtering in memory
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const baseQuery = req.user.role === 'admin' ? {} : { userId: req.user._id };
        
        // Use aggregation to calculate totals for this specific budget's date range and category
        const [expenseResult, upiResult] = await Promise.all([
          Expense.aggregate([
            {
              $match: {
                ...baseQuery,
                category: budget.category,
                date: { $gte: new Date(budget.startDate), $lte: new Date(budget.endDate) }
              }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ]),
          UPIPayment.aggregate([
            {
              $match: {
                ...baseQuery,
                category: budget.category,
                status: 'Success',
                date: { $gte: new Date(budget.startDate), $lte: new Date(budget.endDate) }
              }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ])
        ]);
        
        const expenseTotal = expenseResult.length > 0 ? expenseResult[0].total : 0;
        const upiTotal = upiResult.length > 0 ? upiResult[0].total : 0;
        const spent = expenseTotal + upiTotal;
        
        return {
          ...budget,
          spent,
          remaining: budget.amount - spent,
          percentageUsed: budget.amount > 0 ? (spent / budget.amount) * 100 : 0
        };
      })
    );
    
    res.json(budgetsWithSpent);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching budgets', error: error.message });
  }
});

// Get budget by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Admin users can see any budget, regular users see only their own
    const budgetQuery = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user._id };
    const budget = await Budget.findOne(budgetQuery);
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }
    
    // For admin, get all expenses; for regular users, only their own
    const expenseQuery = req.user.role === 'admin'
      ? { category: budget.category, date: { $gte: budget.startDate, $lte: budget.endDate } }
      : { userId: req.user._id, category: budget.category, date: { $gte: budget.startDate, $lte: budget.endDate } };
    
    // Use aggregation for faster calculation
    const expenseResult = await Expense.aggregate([
      { $match: expenseQuery },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // For admin, get all UPI payments; for regular users, only their own
    const upiQuery = req.user.role === 'admin'
      ? { category: budget.category, date: { $gte: budget.startDate, $lte: budget.endDate }, status: 'Success' }
      : { userId: req.user._id, category: budget.category, date: { $gte: budget.startDate, $lte: budget.endDate }, status: 'Success' };
    
    const upiResult = await UPIPayment.aggregate([
      { $match: upiQuery },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // Calculate totals from aggregation results
    const expenseTotal = expenseResult.length > 0 ? expenseResult[0].total : 0;
    const upiTotal = upiResult.length > 0 ? upiResult[0].total : 0;
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
    // Admin users can update any budget, regular users can only update their own
    const query = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user._id };
    const budget = await Budget.findOneAndUpdate(
      query,
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
    // Admin users can delete any budget, regular users can only delete their own
    const query = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user._id };
    const budget = await Budget.findOneAndDelete(query);
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting budget', error: error.message });
  }
});

module.exports = router;
