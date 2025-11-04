const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const EMI = require('../models/EMI');

// Get all EMIs
router.get('/', authenticate, async (req, res) => {
  try {
    // Sort by creation date descending (newest first - reverse of added order)
    const emis = await EMI.find({ userId: req.user._id, isActive: true }).sort({ createdAt: -1 });
    res.json(emis);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching EMIs', error: error.message });
  }
});

// Get EMI by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const emi = await EMI.findOne({ _id: req.params.id, userId: req.user._id });
    if (!emi) {
      return res.status(404).json({ message: 'EMI not found' });
    }
    res.json(emi);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching EMI', error: error.message });
  }
});

// Create EMI
router.post('/', authenticate, async (req, res) => {
  try {
    const emi = new EMI({
      ...req.body,
      userId: req.user._id
    });
    await emi.save();
    res.status(201).json(emi);
  } catch (error) {
    res.status(400).json({ message: 'Error creating EMI', error: error.message });
  }
});

// Update EMI
router.put('/:id', authenticate, async (req, res) => {
  try {
    const emi = await EMI.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!emi) {
      return res.status(404).json({ message: 'EMI not found' });
    }
    res.json(emi);
  } catch (error) {
    res.status(400).json({ message: 'Error updating EMI', error: error.message });
  }
});

// Delete EMI
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const emi = await EMI.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!emi) {
      return res.status(404).json({ message: 'EMI not found' });
    }
    res.json({ message: 'EMI deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting EMI', error: error.message });
  }
});

// Mark EMI payment
router.post('/:id/pay', authenticate, async (req, res) => {
  try {
    const emi = await EMI.findOne({ _id: req.params.id, userId: req.user._id });
    if (!emi) {
      return res.status(404).json({ message: 'EMI not found' });
    }

    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthKey = currentMonth.toISOString();

    // Check if already paid for this month
    const alreadyPaid = emi.paidMonthDates.some(date => {
      const paidMonth = new Date(date);
      return paidMonth.getFullYear() === currentMonth.getFullYear() &&
             paidMonth.getMonth() === currentMonth.getMonth();
    });

    if (alreadyPaid) {
      return res.status(400).json({ message: 'EMI already marked as paid for this month' });
    }

    emi.paidMonths += 1;
    emi.remainingMonths -= 1;
    emi.paidMonthDates.push(now);
    
    if (emi.remainingMonths <= 0) {
      emi.isActive = false;
    } else {
      // Calculate next due date (approximately 30 days later)
      const nextDue = new Date(emi.nextDueDate);
      nextDue.setMonth(nextDue.getMonth() + 1);
      emi.nextDueDate = nextDue;
    }

    await emi.save();
    res.json(emi);
  } catch (error) {
    res.status(400).json({ message: 'Error updating EMI payment', error: error.message });
  }
});

// Unmark EMI payment for current month
router.post('/:id/unpay', authenticate, async (req, res) => {
  try {
    const emi = await EMI.findOne({ _id: req.params.id, userId: req.user._id });
    if (!emi) {
      return res.status(404).json({ message: 'EMI not found' });
    }

    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Find and remove payment for current month
    const initialLength = emi.paidMonthDates.length;
    emi.paidMonthDates = emi.paidMonthDates.filter(date => {
      const paidMonth = new Date(date);
      return !(paidMonth.getFullYear() === currentMonth.getFullYear() &&
               paidMonth.getMonth() === currentMonth.getMonth());
    });

    if (emi.paidMonthDates.length === initialLength) {
      return res.status(400).json({ message: 'No payment found for this month to unmark' });
    }

    emi.paidMonths -= 1;
    emi.remainingMonths += 1;
    
    if (emi.remainingMonths > emi.tenureMonths) {
      emi.remainingMonths = emi.tenureMonths;
    }

    // Recalculate next due date if needed
    if (emi.remainingMonths > 0 && emi.isActive) {
      const lastPaidDate = emi.paidMonthDates.length > 0 
        ? new Date(Math.max(...emi.paidMonthDates.map(d => new Date(d))))
        : new Date(emi.startDate);
      const nextDue = new Date(lastPaidDate);
      nextDue.setMonth(nextDue.getMonth() + 1);
      emi.nextDueDate = nextDue;
    } else if (emi.remainingMonths === emi.tenureMonths) {
      // Reset to start date + 1 month if no payments made
      const startDate = new Date(emi.startDate);
      startDate.setMonth(startDate.getMonth() + 1);
      emi.nextDueDate = startDate;
    }

    await emi.save();
    res.json(emi);
  } catch (error) {
    res.status(400).json({ message: 'Error unmarking EMI payment', error: error.message });
  }
});

module.exports = router;
