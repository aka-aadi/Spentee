const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Budget = require('../models/Budget');
const EMI = require('../models/EMI');
const UPIPayment = require('../models/UPIPayment');

// Get comprehensive financial summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    console.log('Financial summary request from user:', req.user.username);
    const { startDate, endDate } = req.query;
    console.log('Date range:', { startDate, endDate });
    
    // Admin users can see all data, regular users see only their own
    const query = req.user.role === 'admin' ? {} : { userId: req.user._id };
    
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery = { date: { $gte: new Date(startDate), $lte: new Date(endDate) } };
    }

    console.log('Fetching data with query:', JSON.stringify({ ...query, ...dateQuery }));

    // Fetch all data in parallel with optimized queries
    // Use .lean() for read-only queries (faster, returns plain objects)
    // Use .select() to only fetch needed fields
    const [expenses, income, budgets, emis, upiPayments] = await Promise.all([
      Expense.find({ ...query, ...dateQuery })
        .lean()
        .sort({ date: -1 })
        .catch(err => {
          console.error('Error fetching expenses:', err);
          throw err;
        }),
      Income.find({ ...query, ...dateQuery })
        .lean()
        .sort({ date: -1 })
        .catch(err => {
          console.error('Error fetching income:', err);
          throw err;
        }),
      Budget.find({ ...query, isActive: true })
        .lean()
        .sort({ createdAt: -1 })
        .catch(err => {
          console.error('Error fetching budgets:', err);
          throw err;
        }),
      EMI.find({ ...query, isActive: true })
        .lean()
        .sort({ nextDueDate: 1 })
        .catch(err => {
          console.error('Error fetching EMIs:', err);
          throw err;
        }),
      UPIPayment.find({ ...query, ...dateQuery })
        .lean()
        .sort({ date: -1 })
        .catch(err => {
          console.error('Error fetching UPI payments:', err);
          throw err;
        })
    ]);

    console.log('Data fetched:', {
      expenses: expenses.length,
      income: income.length,
      budgets: budgets.length,
      emis: emis.length,
      upiPayments: upiPayments.length
    });

    // Calculate totals
    const totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    // Only count successful UPI payments
    const totalUPI = upiPayments
      .filter(upi => upi.status === 'Success')
      .reduce((sum, upi) => sum + upi.amount, 0);
    
    // Calculate EMIs - only count active EMIs that have started (current month >= nextDueDate month)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let totalEMI = 0;
    let totalDownPayments = 0;
    
    emis.forEach(emi => {
      const emiStartDate = new Date(emi.startDate);
      const nextDueDate = new Date(emi.nextDueDate);
      const dueMonth = nextDueDate.getMonth();
      const dueYear = nextDueDate.getFullYear();
      
      // EMI starts from next month after start date
      // Count down payment if start date is today or in the past AND if it should be included
      const shouldIncludeDownPayment = emi.includeDownPaymentInBalance !== undefined 
        ? emi.includeDownPaymentInBalance 
        : true; // Default to true for backward compatibility
      
      if (emiStartDate <= now && shouldIncludeDownPayment) {
        totalDownPayments += (emi.downPayment || 0);
      }
      
      // Only count monthly EMI if we're at or past the nextDueDate month
      if (dueYear < currentYear || (dueYear === currentYear && dueMonth <= currentMonth)) {
        totalEMI += emi.monthlyEMI;
      }
    });
    
    const totalBudget = budgets.reduce((sum, budget) => {
      const budgetExpenses = expenses.filter(exp => 
        exp.category === budget.category &&
        new Date(exp.date) >= budget.startDate &&
        new Date(exp.date) <= budget.endDate
      );
      const spent = budgetExpenses.reduce((s, e) => s + e.amount, 0);
      return sum + Math.max(0, budget.amount - spent);
    }, 0);

    // Calculate total expenses (expenses + down payments + EMIs + UPI payments)
    const totalAllExpenses = totalExpenses + totalEMI + totalDownPayments + totalUPI;
    
    // Calculate remaining balance (deduct down payments that have been paid)
    const availableBalance = totalIncome - totalExpenses - totalEMI - totalDownPayments - totalUPI;

    // Use aggregation for faster category calculations
    const [expenseCategoryTotals, upiCategoryTotals, incomeTypeTotals] = await Promise.all([
      Expense.aggregate([
        { $match: { ...query, ...dateQuery } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } }
      ]),
      UPIPayment.aggregate([
        { $match: { ...query, ...dateQuery, status: 'Success' } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } }
      ]),
      Income.aggregate([
        { $match: { ...query, ...dateQuery } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
      ])
    ]);

    // Build expenses by category
    const expensesByCategory = {};
    expenseCategoryTotals.forEach(item => {
      expensesByCategory[item._id] = item.total;
    });
    
    // Add UPI payments by category (merge with expenses)
    upiCategoryTotals.forEach(item => {
      expensesByCategory[item._id] = (expensesByCategory[item._id] || 0) + item.total;
    });
    
    // Add EMI to expenses by category
    if (totalEMI > 0) {
      expensesByCategory['EMI'] = (expensesByCategory['EMI'] || 0) + totalEMI;
    }
    
    // Add Down Payments as a separate category if they exist
    if (totalDownPayments > 0) {
      expensesByCategory['Down Payments'] = (expensesByCategory['Down Payments'] || 0) + totalDownPayments;
    }

    // Build income by type
    const incomeByType = {};
    incomeTypeTotals.forEach(item => {
      incomeByType[item._id] = item.total;
    });

    res.json({
      income: {
        total: totalIncome,
        count: income.length,
        byType: incomeByType,
        items: income
      },
      expenses: {
        total: totalExpenses,
        totalAll: totalAllExpenses, // Total including expenses, EMIs, down payments, and UPI
        count: expenses.length,
        byCategory: expensesByCategory,
        items: expenses
      },
      emis: {
        totalMonthly: totalEMI,
        totalDownPayments,
        count: emis.length,
        items: emis
      },
      budgets: {
        total: budgets.reduce((sum, b) => sum + b.amount, 0),
        count: budgets.length,
        items: budgets
      },
      balance: {
        available: availableBalance,
        availableBalance: availableBalance,
        totalIncome,
        totalExpenses,
        totalEMI,
        totalDownPayments,
        totalUPI,
        totalAllExpenses, // Total expenses including all components
        remainingAfterExpenses: totalIncome - totalExpenses - totalEMI, // Net savings after EMIs
        remainingAfterAll: availableBalance
      }
    });
    
    console.log('Financial summary sent successfully');
  } catch (error) {
    console.error('Error in financial summary:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Error fetching financial summary', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
