const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const UPIPayment = require('../models/UPIPayment');

// Get all budgets
router.get('/', authenticate, async (req, res) => {
  try {
    // All users see all budgets (shared data)
    const budgetQuery = { isActive: true };
    
    console.log(`[BUDGET GET] User: ${req.user._id} (${req.user.username}), Role: ${req.user.role}, Query: {isActive: true} (shared data)`);
    
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
        // All users see all data (shared)
        const baseQuery = {};
        
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
    // All users can see any budget (shared data)
    const budget = await Budget.findById(req.params.id);
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }
    
    // All users see all expenses/UPI (shared data)
    const expenseQuery = { category: budget.category, date: { $gte: budget.startDate, $lte: budget.endDate } };
    
    // Use aggregation for faster calculation
    const expenseResult = await Expense.aggregate([
      { $match: expenseQuery },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // All users see all UPI payments (shared data)
    const upiQuery = { category: budget.category, date: { $gte: budget.startDate, $lte: budget.endDate }, status: 'Success' };
    
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
    // Remove userId from body - data is shared, userId is optional for tracking
    const { userId, ...budgetData } = req.body;
    
    // Set userId for tracking who created it, but data is shared
    const budget = new Budget({
      ...budgetData,
      userId: req.user._id
    });
    
    console.log(`[BUDGET CREATE] User: ${req.user._id} (${req.user.username}), Role: ${req.user.role} (shared data)`);
    
    await budget.save();
    res.status(201).json(budget);
  } catch (error) {
    res.status(400).json({ message: 'Error creating budget', error: error.message });
  }
});

// Update budget
router.put('/:id', authenticate, async (req, res) => {
  try {
    // Remove userId from body - data is shared, any user can update
    const { userId, ...updateData } = req.body;
    
    console.log(`[BUDGET UPDATE] User: ${req.user._id} (${req.user.username}), Role: ${req.user.role} (shared data)`);
    
    const budget = await Budget.findByIdAndUpdate(
      req.params.id,
      updateData, // Use sanitized data without userId
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
    // All users can delete any budget (shared data)
    console.log(`[BUDGET DELETE] User: ${req.user._id} (${req.user.username}), Role: ${req.user.role} (shared data)`);
    
    const budget = await Budget.findByIdAndDelete(req.params.id);
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }
    console.log(`[BUDGET DELETE] Deleted budget ${req.params.id}`);
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting budget', error: error.message });
  }
});

module.exports = router;
