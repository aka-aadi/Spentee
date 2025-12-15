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
    
    // All users see only their own data
    const query = { userId: req.user._id };
    
    console.log(`[FINANCIAL SUMMARY] User: ${req.user._id} (${req.user.username}), Role: ${req.user.role}, Query:`, JSON.stringify(query));
    
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery = { date: { $gte: new Date(startDate), $lte: new Date(endDate) } };
    }

    // Use aggregation pipelines for MUCH faster calculations - only fetch totals, not all documents
    // This dramatically reduces data transfer and processing time
    const [allExpensesTotal, allIncomeTotal, allUPITotal, allSavingsTotal, expensesTotal, incomeTotal, expenses, income, budgets, emis, upiPayments, savings, allEMIsForBalance] = await Promise.all([
      // Calculate totals using aggregation (MUCH faster than fetching all documents)
      // IMPORTANT: Explicitly use userId to ensure data isolation
      Expense.aggregate([
        { $match: { userId: req.user._id } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]).then(result => ({ total: result[0]?.total || 0, count: result[0]?.count || 0 })),
      Income.aggregate([
        { $match: { userId: req.user._id } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]).then(result => ({ total: result[0]?.total || 0, count: result[0]?.count || 0 })),
      UPIPayment.aggregate([
        { $match: { userId: req.user._id, status: 'Success' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]).then(result => ({ total: result[0]?.total || 0, count: result[0]?.count || 0 })),
      Saving.aggregate([
        { $match: { userId: req.user._id } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]).then(result => ({ total: result[0]?.total || 0, count: result[0]?.count || 0 })),
      // Calculate monthly totals using aggregation
      // IMPORTANT: Explicitly use userId to ensure data isolation
      Expense.aggregate([
        { $match: { userId: req.user._id, ...dateQuery } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]).then(result => ({ total: result[0]?.total || 0, count: result[0]?.count || 0 })),
      Income.aggregate([
        { $match: { userId: req.user._id, ...dateQuery } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]).then(result => ({ total: result[0]?.total || 0, count: result[0]?.count || 0 })),
      // Only fetch items for category breakdown (reduced limits for faster response)
      // IMPORTANT: Explicitly use userId to ensure data isolation
      Expense.find({ userId: req.user._id, ...dateQuery })
        .lean()
        .select('amount category date userId')
        .sort({ date: -1 })
        .limit(100) // Reduced from 500 for faster response
        .catch(err => {
          console.error('Error fetching expenses:', err);
          throw err;
        }),
      Income.find({ userId: req.user._id, ...dateQuery })
        .lean()
        .select('amount type date userId')
        .sort({ date: -1 })
        .limit(100) // Reduced from 500 for faster response
        .catch(err => {
          console.error('Error fetching income:', err);
          throw err;
        }),
      Budget.find({ userId: req.user._id, isActive: true })
        .lean()
        .select('category amount startDate endDate userId')
        .sort({ createdAt: -1 })
        .limit(50) // Reduced from 100 for faster response
        .catch(err => {
          console.error('Error fetching budgets:', err);
          throw err;
        }),
      // IMPORTANT: Must explicitly include userId in query to ensure data isolation
      EMI.find({ userId: req.user._id, isActive: true })
        .lean()
        .select('monthlyEMI downPayment startDate paidMonthDates includeDownPaymentInBalance name userId')
        .sort({ nextDueDate: 1 })
        .limit(50) // Reduced from 100 for faster response
        .catch(err => {
          console.error('Error fetching EMIs:', err);
          throw err;
        }),
      // IMPORTANT: Explicitly use userId to ensure data isolation
      UPIPayment.find({ userId: req.user._id, ...dateQuery, status: 'Success' })
        .lean()
        .select('amount category date userId')
        .sort({ date: -1 })
        .limit(100) // Reduced from 500 for faster response
        .catch(err => {
          console.error('Error fetching UPI payments:', err);
          throw err;
        }),
      Saving.find({ userId: req.user._id, ...dateQuery })
        .lean()
        .select('amount date userId')
        .sort({ date: -1 })
        .limit(100) // Reduced from 500 for faster response
        .catch(err => {
          console.error('Error fetching savings:', err);
          return [];
        }),
      // Fetch ALL EMIs for cumulative balance calculation (not limited, not date-filtered)
      // IMPORTANT: Must explicitly include userId in query to ensure data isolation
      EMI.find({ userId: req.user._id, isActive: true })
        .lean()
        .select('monthlyEMI downPayment startDate paidMonthDates includeDownPaymentInBalance userId')
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
    
    // Calculate EMIs for current month/date range - only count EMIs that are marked as paid WITHIN the date range
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Determine date range for filtering paid months
    let dateRangeStart, dateRangeEnd;
    if (startDate && endDate) {
      dateRangeStart = new Date(startDate);
      dateRangeEnd = new Date(endDate);
    } else {
      // Default to current month if no date range specified
      dateRangeStart = new Date(currentYear, currentMonth, 1);
      dateRangeEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    }
    
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
      
      // EMI starts from next month after start date
      // Count down payment if start date is today or in the past AND if it should be included
      // AND if the start date falls within the date range
      const shouldIncludeDownPayment = emi.includeDownPaymentInBalance !== undefined 
        ? emi.includeDownPaymentInBalance 
        : true; // Default to true for backward compatibility
      
      // Only count down payment if it falls within the date range
      if (emiStartDate >= dateRangeStart && emiStartDate <= dateRangeEnd && shouldIncludeDownPayment) {
        totalDownPayments += (emi.downPayment || 0);
      }
      
      // Only count EMI amounts for months that are marked as paid WITHIN the date range
      const paidMonthsInRange = paidMonthDates.filter(paidDate => {
        const paid = new Date(paidDate);
        return paid >= dateRangeStart && paid <= dateRangeEnd;
      });
      
      const emiAmountForRange = paidMonthsInRange.length * emi.monthlyEMI;
      totalEMI += emiAmountForRange;
      
      if (emiAmountForRange > 0 || (emiStartDate >= dateRangeStart && emiStartDate <= dateRangeEnd)) {
        console.log(`[MONTHLY CALC] EMI ${index + 1}/${emis.length}:`, {
          name: emi.name || 'Unnamed',
          monthlyEMI: emi.monthlyEMI,
          totalPaidMonths: paidMonthDates.length,
          paidMonthsInRange: paidMonthsInRange.length,
          emiAmountForRange,
          downPayment: (emiStartDate >= dateRangeStart && emiStartDate <= dateRangeEnd && shouldIncludeDownPayment) ? (emi.downPayment || 0) : 0
        });
      }
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
    
    console.log(`[BALANCE CALC] User: ${req.user._id} - Processing ${allEMIsForBalance.length} EMIs for balance calculation`);
    
    // Verify all EMIs belong to the current user
    const wrongUserEMIs = allEMIsForBalance.filter(emi => emi.userId && emi.userId.toString() !== req.user._id.toString());
    if (wrongUserEMIs.length > 0) {
      console.error(`[BALANCE CALC ERROR] Found ${wrongUserEMIs.length} EMIs from other users! User: ${req.user._id}, Wrong EMIs:`, wrongUserEMIs.map(e => ({ id: e._id, userId: e.userId })));
    }
    
    allEMIsForBalance.forEach((emi, index) => {
      // Double-check userId matches (safety check)
      if (emi.userId && emi.userId.toString() !== req.user._id.toString()) {
        console.error(`[BALANCE CALC ERROR] Skipping EMI ${emi._id} - belongs to user ${emi.userId}, not ${req.user._id}`);
        return; // Skip this EMI
      }
      
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
      // Filter expenses by userId AND category/date to ensure data isolation
      const budgetExpenses = expenses.filter(exp => {
        // Safety check: verify expense belongs to current user
        if (exp.userId && exp.userId.toString() !== req.user._id.toString()) {
          return false; // Skip expenses from other users
        }
        return exp.category === budget.category &&
               new Date(exp.date) >= budget.startDate &&
               new Date(exp.date) <= budget.endDate;
      });
      const spent = budgetExpenses.reduce((s, e) => s + e.amount, 0);
      return sum + Math.max(0, budget.amount - spent);
    }, 0);

    // Calculate total expenses (expenses + down payments + EMIs + UPI payments + savings)
    const totalAllExpenses = totalExpenses + totalEMI + totalDownPayments + totalUPI + totalSavings;
    
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
    // IMPORTANT: Explicitly use userId to ensure data isolation
    const [expenseCategoryTotals, upiCategoryTotals, incomeTypeTotals] = await Promise.all([
      Expense.aggregate([
        { $match: { userId: req.user._id, ...dateQuery } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } }
      ]),
      UPIPayment.aggregate([
        { $match: { userId: req.user._id, ...dateQuery, status: 'Success' } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } }
      ]),
      Income.aggregate([
        { $match: { userId: req.user._id, ...dateQuery } },
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

    // Add Savings as a separate category (shown in blue in UI)
    if (totalSavings > 0) {
      expensesByCategory['Savings'] = (expensesByCategory['Savings'] || 0) + totalSavings;
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
        total: totalExpenses,
        totalAll: totalAllExpenses, // Total including expenses, EMIs, down payments, and UPI
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
        totalExpenses,
        totalEMI,
        totalDownPayments,
        totalUPI,
        totalSavings,
        totalAllExpenses, // Total expenses including all components
        remainingAfterExpenses: totalIncome - totalExpenses - totalEMI, // Net savings after EMIs
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
