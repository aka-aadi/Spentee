const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Saving = require('../models/Saving');

// Get all savings
router.get('/', authenticate, async (req, res) => {
  try {
    // Admin users can see all savings, regular users see only their own
    const query = req.user.role === 'admin' ? {} : { userId: req.user._id };
    const savings = await Saving.find(query)
      .lean() // Use lean() for read-only queries - much faster
      .sort({ date: -1 });
    res.json(savings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching savings', error: error.message });
  }
});

// Get saving by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Admin users can see any saving, regular users see only their own
    const query = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user._id };
    const saving = await Saving.findOne(query);
    if (!saving) {
      return res.status(404).json({ message: 'Saving not found' });
    }
    res.json(saving);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching saving', error: error.message });
  }
});

// Create saving
router.post('/', authenticate, async (req, res) => {
  try {
    const saving = new Saving({
      ...req.body,
      userId: req.user._id
    });
    await saving.save();
    res.status(201).json(saving);
  } catch (error) {
    res.status(400).json({ message: 'Error creating saving', error: error.message });
  }
});

// Update saving
router.put('/:id', authenticate, async (req, res) => {
  try {
    // Admin users can update any saving, regular users can only update their own
    const query = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user._id };
    const saving = await Saving.findOneAndUpdate(
      query,
      req.body,
      { new: true, runValidators: true }
    );
    if (!saving) {
      return res.status(404).json({ message: 'Saving not found' });
    }
    res.json(saving);
  } catch (error) {
    res.status(400).json({ message: 'Error updating saving', error: error.message });
  }
});

// Delete saving
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // Admin users can delete any saving, regular users can only delete their own
    const query = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, userId: req.user._id };
    const saving = await Saving.findOneAndDelete(query);
    if (!saving) {
      return res.status(404).json({ message: 'Saving not found' });
    }
    res.json({ message: 'Saving deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting saving', error: error.message });
  }
});

// Get savings summary
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    // Admin users can see all savings, regular users see only their own
    const query = req.user.role === 'admin' ? {} : { userId: req.user._id };
    
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // Use aggregation for faster calculation
    const [savings, totalResult] = await Promise.all([
      Saving.find(query).lean(),
      Saving.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);
    
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    res.json({
      total,
      count: savings.length,
      items: savings
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching summary', error: error.message });
  }
});

module.exports = router;

