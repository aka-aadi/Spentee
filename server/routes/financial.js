const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Budget = require('../models/Budget');
const EMI = require('../models/EMI');
const UPIPayment = require('../models/UPIPayment');
const Saving = require('../models/Saving');

// Get comprehensive financial summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Determine date range for calculations
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let dateQuery = {};
    let dateRangeStart, dateRangeEnd;
    
    // Always initialize dateRangeStart and dateRangeEnd
    if (startDate && endDate) {
      dateRangeStart = new Date(startDate);
      dateRangeEnd = new Date(endDate);
      dateQuery = { date: { $gte: dateRangeStart, $lte: dateRangeEnd } };
    } else {
      // When no date range provided, use current month for EMI calculations
      // But use empty dateQuery for aggregations to get all data
      dateRangeStart = new Date(currentYear, currentMonth, 1);
      dateRangeEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
      // dateQuery remains empty {} for all-time aggregations
    }
    
    // Ensure variables are always defined
    if (!dateRangeStart || !dateRangeEnd) {
      dateRangeStart = new Date(currentYear, currentMonth, 1);
      dateRangeEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    }

    // Use aggregation pipelines for MUCH faster calculations
    const [allExpensesTotal, allIncomeTotal, allUPITotal, allSavingsTotal, expensesTotal, incomeTotal, expenses, income, budgets, emis, upiPayments, savings, allEMIsForBalance] = await Promise.all([
      Expense.aggregate([
        { $match: {} },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]).then(result => ({ total: result[0]?.total || 0, count: result[0]?.count || 0 })),
      Income.aggregate([
        { $match: {} },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]).then(result => ({ total: result[0]?.total || 0, count: result[0]?.count || 0 })),
      UPIPayment.aggregate([
        { $match: { status: 'Success' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]).then(result => ({ total: result[0]?.total || 0, count: result[0]?.count || 0 })),
      Saving.aggregate([
        { $match: {} },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]).then(result => ({ total: result[0]?.total || 0, count: result[0]?.count || 0 })),
      Expense.aggregate([
        { $match: dateQuery },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]).then(result => ({ total: result[0]?.total || 0, count: result[0]?.count || 0 })),
      Income.aggregate([
        { $match: dateQuery },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]).then(result => ({ total: result[0]?.total || 0, count: result[0]?.count || 0 })),
      Expense.find(dateQuery)
        .lean()
        .select('amount category date')
        .sort({ date: -1 })
        .limit(100)
        .catch(err => {
          console.error('Error fetching expenses:', err);
          throw err;
        }),
      Income.find(dateQuery)
        .lean()
        .select('amount type date')
        .sort({ date: -1 })
        .limit(100)
        .catch(err => {
          console.error('Error fetching income:', err);
          throw err;
        }),
      Budget.find({ isActive: true })
        .lean()
        .select('category amount startDate endDate')
        .sort({ createdAt: -1 })
        .limit(50)
        .catch(err => {
          console.error('Error fetching budgets:', err);
          throw err;
        }),
      EMI.find({ isActive: true })
        .lean()
        .select('monthlyEMI downPayment startDate paidMonthDates includeDownPaymentInBalance name endDate isActive')
        .sort({ nextDueDate: 1 })
        .catch(err => {
          console.error('Error fetching EMIs:', err);
          throw err;
        }),
      UPIPayment.find({ ...dateQuery, status: 'Success' })
        .lean()
        .select('amount category date')
        .sort({ date: -1 })
        .limit(100)
        .catch(err => {
          console.error('Error fetching UPI payments:', err);
          throw err;
        }),
      Saving.find(dateQuery)
        .lean()
        .select('amount date')
        .sort({ date: -1 })
        .limit(100)
        .catch(err => {
          console.error('Error fetching savings:', err);
          return [];
        }),
      EMI.find({ isActive: true })
        .lean()
        .select('monthlyEMI downPayment startDate paidMonthDates includeDownPaymentInBalance')
        .catch(err => {
          console.error('Error fetching all EMIs for balance:', err);
          return [];
        })
    ]);

    // Use aggregated totals instead of calculating from arrays (MUCH faster)
    const cumulativeIncome = allIncomeTotal.total;
    const cumulativeExpenses = allExpensesTotal.total;
    const cumulativeUPI = allUPITotal.total;
    const cumulativeSavings = allSavingsTotal.total;
    const totalIncome = incomeTotal.total;
    const totalExpenses = expensesTotal.total;
    
    // Verify aggregation totals by manually calculating (for debugging)
    const manualIncomeTotal = income.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    const manualExpensesTotal = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const manualUPITotal = upiPayments.reduce((sum, upi) => sum + (upi.amount || 0), 0);
    const manualSavingsTotal = savings.reduce((sum, sav) => sum + (sav.amount || 0), 0);
    
    console.log(`[BALANCE CALC] User: ${req.user._id} (${req.user.username}) - Cumulative totals:`, {
      income: {
        aggregated: cumulativeIncome,
        fromItems: manualIncomeTotal,
        itemCount: income.length,
        match: Math.abs(cumulativeIncome - manualIncomeTotal) < 0.01
      },
      expenses: {
        aggregated: cumulativeExpenses,
        fromItems: manualExpensesTotal,
        itemCount: expenses.length,
        match: Math.abs(cumulativeExpenses - manualExpensesTotal) < 0.01
      },
      upi: {
        aggregated: cumulativeUPI,
        fromItems: manualUPITotal,
        itemCount: upiPayments.length,
        match: Math.abs(cumulativeUPI - manualUPITotal) < 0.01
      },
      savings: {
        aggregated: cumulativeSavings,
        fromItems: manualSavingsTotal,
        itemCount: savings.length,
        match: Math.abs(cumulativeSavings - manualSavingsTotal) < 0.01
      }
    });
    
    // Calculate totals for date range (for monthly breakdown) - use aggregated totals
    // Only count successful UPI payments (already filtered in query)
    const totalUPI = upiPayments.reduce((sum, upi) => sum + (upi.amount || 0), 0);
    const totalSavings = savings.reduce((sum, saving) => sum + (saving.amount || 0), 0);
    
    console.log(`[MONTHLY CALC] User: ${req.user._id} (${req.user.username}) - Monthly aggregated totals:`, {
      income: totalIncome,
      expenses: totalExpenses,
      upi: totalUPI,
      savings: totalSavings,
      dateRange: dateQuery
    });
    
    // Calculate EMIs for current month/date range - use the same date range as expenses
    
    let totalEMI = 0;
    let totalDownPayments = 0;
    
    console.log(`[MONTHLY CALC] User: ${req.user._id} (${req.user.username}) - Date range for monthly totals:`, {
      start: dateRangeStart.toISOString(),
      end: dateRangeEnd.toISOString(),
      emiCount: emis.length
    });
    
    emis.forEach((emi, index) => {
      const emiStartDate = new Date(emi.startDate);
      const paidMonthDates = Array.isArray(emi.paidMonthDates) ? emi.paidMonthDates : [];
      
      // Check if EMI is active and should be counted for this month
      // An EMI should be counted if:
      // 1. It's active (isActive: true)
      // 2. The start date is before or equal to the end of the date range
      // 3. The EMI hasn't ended (endDate check)
      const emiEndDate = new Date(emi.endDate || emiStartDate);
      const shouldCountEMI = emi.isActive && emiStartDate <= dateRangeEnd && emiEndDate >= dateRangeStart;
      
      if (!shouldCountEMI) {
        return; // Skip this EMI if it doesn't apply to this month
      }
      
      // Count down payment if start date falls within the date range AND if it should be included
      const shouldIncludeDownPayment = emi.includeDownPaymentInBalance !== undefined 
        ? emi.includeDownPaymentInBalance 
        : true; // Default to true for backward compatibility
      
      // Count down payment if it falls within the date range
      if (emiStartDate >= dateRangeStart && emiStartDate <= dateRangeEnd && shouldIncludeDownPayment) {
        totalDownPayments += (emi.downPayment || 0);
      }
      
      // For monthly EMI calculation, count ALL active EMIs for the month (not just paid ones)
      // This shows the total EMI obligation for the month, regardless of payment status
      // If the EMI start date is before or during this month, count it
      if (emiStartDate <= dateRangeEnd) {
        // Count this EMI for the month (one monthly payment)
        totalEMI += emi.monthlyEMI;
      }
      
      // Also track paid EMIs for reference
      const paidMonthsInRange = paidMonthDates.filter(paidDate => {
        const paid = new Date(paidDate);
        return paid >= dateRangeStart && paid <= dateRangeEnd;
      });
      
      console.log(`[MONTHLY CALC] EMI ${index + 1}/${emis.length}:`, {
        name: emi.name || 'Unnamed',
        monthlyEMI: emi.monthlyEMI,
        isActive: emi.isActive,
        startDate: emiStartDate.toISOString(),
        endDate: emiEndDate.toISOString(),
        shouldCount: shouldCountEMI,
        totalPaidMonths: paidMonthDates.length,
        paidMonthsInRange: paidMonthsInRange.length,
        emiAmountForMonth: emi.monthlyEMI,
        downPayment: (emiStartDate >= dateRangeStart && emiStartDate <= dateRangeEnd && shouldIncludeDownPayment) ? (emi.downPayment || 0) : 0
      });
    });
    
    console.log(`[MONTHLY CALC] User: ${req.user._id} (${req.user.username}) - Monthly totals:`, {
      totalEMI,
      totalDownPayments,
      totalExpenses,
      totalIncome
    });
    
    // Calculate CUMULATIVE (all-time) EMIs and down payments for balance calculation
    // This ensures previous months' balances are included
    let cumulativeTotalEMI = 0;
    let cumulativeTotalDownPayments = 0;
    
    console.log(`[BALANCE CALC] Processing ${allEMIsForBalance.length} EMIs for balance calculation`);
    
    allEMIsForBalance.forEach((emi, index) => {
      
      const emiStartDate = new Date(emi.startDate);
      const paidMonthDates = Array.isArray(emi.paidMonthDates) ? emi.paidMonthDates : [];
      
      // Count down payment if start date is today or in the past AND if it should be included
      const shouldIncludeDownPayment = emi.includeDownPaymentInBalance !== undefined 
        ? emi.includeDownPaymentInBalance 
        : true; // Default to true for backward compatibility
      
      let downPaymentAdded = 0;
      if (emiStartDate <= now && shouldIncludeDownPayment) {
        downPaymentAdded = (emi.downPayment || 0);
        cumulativeTotalDownPayments += downPaymentAdded;
      }
      
      // Count ALL paid EMIs (all-time, not just current month)
      // Only count if there are actually paid months
      let emiAmountAdded = 0;
      if (paidMonthDates.length > 0) {
        emiAmountAdded = (paidMonthDates.length * emi.monthlyEMI);
        cumulativeTotalEMI += emiAmountAdded;
      }
      
      // Log each EMI's contribution for debugging
      console.log(`[BALANCE CALC] EMI ${index + 1}/${allEMIsForBalance.length}:`, {
        id: emi._id,
        name: emi.name || 'Unnamed',
        monthlyEMI: emi.monthlyEMI,
        downPayment: emi.downPayment || 0,
        paidMonths: paidMonthDates.length,
        emiContribution: emiAmountAdded,
        downPaymentContribution: downPaymentAdded,
        includeDownPayment: shouldIncludeDownPayment,
        startDate: emiStartDate.toISOString()
      });
    });
    
    console.log(`[BALANCE CALC] User: ${req.user._id} - EMI totals:`, {
      cumulativeEMI: cumulativeTotalEMI,
      cumulativeDownPayments: cumulativeTotalDownPayments,
      emiCount: allEMIsForBalance.length
    });
    
    const totalBudget = budgets.reduce((sum, budget) => {
      const budgetExpenses = expenses.filter(exp => {
        return exp.category === budget.category &&
               new Date(exp.date) >= budget.startDate &&
               new Date(exp.date) <= budget.endDate;
      });
      const spent = budgetExpenses.reduce((s, e) => s + e.amount, 0);
      return sum + Math.max(0, budget.amount - spent);
    }, 0);

    // Calculate total expenses (expenses + down payments + EMIs + UPI payments + savings)
    // This is the complete monthly expense including all obligations
    const totalAllExpenses = totalExpenses + totalEMI + totalDownPayments + totalUPI + totalSavings;
    
    console.log(`[MONTHLY CALC] User: ${req.user._id} (${req.user.username}) - Complete monthly expense breakdown:`, {
      regularExpenses: totalExpenses,
      emis: totalEMI,
      downPayments: totalDownPayments,
      upi: totalUPI,
      savings: totalSavings,
      totalAllExpenses
    });
    
    // Calculate cumulative available balance (from all time, not just current month)
    // This ensures balance carries over from previous months
    // Use cumulative EMIs and down payments (all-time) instead of current month only
    const availableBalance = cumulativeIncome - cumulativeExpenses - cumulativeTotalEMI - cumulativeTotalDownPayments - cumulativeUPI - cumulativeSavings;
    
    // Detailed breakdown for debugging
    const breakdown = {
      income: cumulativeIncome,
      expenses: cumulativeExpenses,
      emis: cumulativeTotalEMI,
      downPayments: cumulativeTotalDownPayments,
      upi: cumulativeUPI,
      savings: cumulativeSavings,
      subtotalAfterExpenses: cumulativeIncome - cumulativeExpenses,
      subtotalAfterEMIs: cumulativeIncome - cumulativeExpenses - cumulativeTotalEMI,
      subtotalAfterDownPayments: cumulativeIncome - cumulativeExpenses - cumulativeTotalEMI - cumulativeTotalDownPayments,
      subtotalAfterUPI: cumulativeIncome - cumulativeExpenses - cumulativeTotalEMI - cumulativeTotalDownPayments - cumulativeUPI,
      finalBalance: availableBalance
    };
    
    console.log(`[BALANCE CALC] User: ${req.user._id} (${req.user.username}) - Available Balance Calculation:`, {
      formula: 'Income - Expenses - EMIs - DownPayments - UPI - Savings',
      breakdown,
      stepByStep: [
        `Starting Income: ₹${cumulativeIncome.toFixed(2)}`,
        `Subtract Expenses: ₹${cumulativeIncome.toFixed(2)} - ₹${cumulativeExpenses.toFixed(2)} = ₹${(cumulativeIncome - cumulativeExpenses).toFixed(2)}`,
        `Subtract EMIs: ₹${(cumulativeIncome - cumulativeExpenses).toFixed(2)} - ₹${cumulativeTotalEMI.toFixed(2)} = ₹${(cumulativeIncome - cumulativeExpenses - cumulativeTotalEMI).toFixed(2)}`,
        `Subtract Down Payments: ₹${(cumulativeIncome - cumulativeExpenses - cumulativeTotalEMI).toFixed(2)} - ₹${cumulativeTotalDownPayments.toFixed(2)} = ₹${(cumulativeIncome - cumulativeExpenses - cumulativeTotalEMI - cumulativeTotalDownPayments).toFixed(2)}`,
        `Subtract UPI: ₹${(cumulativeIncome - cumulativeExpenses - cumulativeTotalEMI - cumulativeTotalDownPayments).toFixed(2)} - ₹${cumulativeUPI.toFixed(2)} = ₹${(cumulativeIncome - cumulativeExpenses - cumulativeTotalEMI - cumulativeTotalDownPayments - cumulativeUPI).toFixed(2)}`,
        `Subtract Savings: ₹${(cumulativeIncome - cumulativeExpenses - cumulativeTotalEMI - cumulativeTotalDownPayments - cumulativeUPI).toFixed(2)} - ₹${cumulativeSavings.toFixed(2)} = ₹${availableBalance.toFixed(2)}`
      ],
      result: availableBalance
    });

    // Use aggregation for faster category calculations
    const [expenseCategoryTotals, upiCategoryTotals, incomeTypeTotals] = await Promise.all([
      Expense.aggregate([
        { $match: dateQuery },
        { $group: { _id: '$category', total: { $sum: '$amount' } } }
      ]),
      UPIPayment.aggregate([
        { $match: { ...dateQuery, status: 'Success' } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } }
      ]),
      Income.aggregate([
        { $match: dateQuery },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
      ])
    ]);
    
    // Build expenses by category
    const expensesByCategory = {};
    
    // First, add regular expenses by category (excluding special categories that will be added separately)
    expenseCategoryTotals.forEach(item => {
      // Skip categories that will be replaced with calculated totals
      if (item._id !== 'EMI' && item._id !== 'Down Payments' && item._id !== 'Savings') {
        expensesByCategory[item._id] = item.total;
      }
    });
    
    // Add UPI payments by category (merge with expenses, but exclude special categories)
    upiCategoryTotals.forEach(item => {
      // Skip categories that will be replaced with calculated totals
      if (item._id !== 'EMI' && item._id !== 'Down Payments' && item._id !== 'Savings') {
        expensesByCategory[item._id] = (expensesByCategory[item._id] || 0) + item.total;
      }
    });
    
    // Add EMI to expenses by category (replace any existing "EMI" category from expenses/UPI)
    if (totalEMI > 0) {
      expensesByCategory['EMI'] = totalEMI;
    }
    
    // Add Down Payments as a separate category (replace any existing "Down Payments" category)
    if (totalDownPayments > 0) {
      expensesByCategory['Down Payments'] = totalDownPayments;
    }

    // Add Savings as a separate category (replace any existing "Savings" category)
    if (totalSavings > 0) {
      expensesByCategory['Savings'] = totalSavings;
    }
    
    // Verify the sum matches totalAllExpenses
    const categorySum = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0);
    const difference = Math.abs(categorySum - totalAllExpenses);
    if (difference > 0.01) {
      console.warn(`[CATEGORY CALC] Sum mismatch: categorySum=${categorySum}, totalAllExpenses=${totalAllExpenses}, difference=${difference}`);
    }

    // Build income by type
    const incomeByType = {};
    incomeTypeTotals.forEach(item => {
      incomeByType[item._id] = item.total;
    });

    res.json({
      income: {
        total: totalIncome,
        count: incomeTotal.count,
        byType: incomeByType,
        items: income.slice(0, 100) // Only return first 100 items for display
      },
      expenses: {
        total: totalExpenses, // Regular expenses only (without EMIs, down payments, UPI, savings)
        regularExpenses: totalExpenses, // Just regular expenses (without EMIs, down payments, etc.)
        totalAll: totalAllExpenses, // Total including expenses, EMIs, down payments, UPI, and savings
        count: expensesTotal.count,
        byCategory: expensesByCategory,
        items: expenses.slice(0, 100) // Only return first 100 items for display
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
      savings: {
        total: totalSavings,
        count: savings.length,
        items: savings
      },
      balance: {
        available: availableBalance,
        availableBalance: availableBalance,
        totalIncome,
        totalExpenses: totalAllExpenses, // Monthly expenses including EMIs, down payments, UPI, and savings
        regularExpenses: totalExpenses, // Just regular expenses (without EMIs, etc.)
        totalEMI,
        totalDownPayments,
        totalUPI,
        totalSavings,
        totalAllExpenses, // Total expenses including all components
        remainingAfterExpenses: totalIncome - totalAllExpenses, // Net savings after all expenses
        remainingAfterAll: availableBalance
      }
    });
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
