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
    const { startDate, endDate } = req.query;
    const query = { userId: req.user._id };
    
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery = { date: { $gte: new Date(startDate), $lte: new Date(endDate) } };
    }

    // Fetch all data
    const [expenses, income, budgets, emis, upiPayments] = await Promise.all([
      Expense.find({ ...query, ...dateQuery }),
      Income.find({ ...query, ...dateQuery }),
      Budget.find({ ...query, isActive: true }),
      EMI.find({ ...query, isActive: true }),
      UPIPayment.find({ ...query, ...dateQuery })
    ]);

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

    // Expenses by category (including EMI and UPI as categories)
    const expensesByCategory = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});
    
    // Add UPI payments by category (they will be merged with expenses of the same category)
    upiPayments
      .filter(upi => upi.status === 'Success')
      .forEach(upi => {
        expensesByCategory[upi.category] = (expensesByCategory[upi.category] || 0) + upi.amount;
      });
    
    // Add EMI to expenses by category
    if (totalEMI > 0) {
      expensesByCategory['EMI'] = (expensesByCategory['EMI'] || 0) + totalEMI;
    }
    
    // Add Down Payments as a separate category if they exist
    if (totalDownPayments > 0) {
      expensesByCategory['Down Payments'] = (expensesByCategory['Down Payments'] || 0) + totalDownPayments;
    }

    // Income by type
    const incomeByType = income.reduce((acc, inc) => {
      acc[inc.type] = (acc[inc.type] || 0) + inc.amount;
      return acc;
    }, {});

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
  } catch (error) {
    res.status(500).json({ message: 'Error fetching financial summary', error: error.message });
  }
});

module.exports = router;
