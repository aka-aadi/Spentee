const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Saving = require('../models/Saving');

// Get all savings
router.get('/', authenticate, async (req, res) => {
  try {
    // All users see all savings (shared data)
    const query = {};
    
    console.log(`[SAVING GET] User: ${req.user._id} (${req.user.username}), Role: ${req.user.role}, Query: {} (shared data)`);
    
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    let savingsQuery = Saving.find(query)
      .lean() // Use lean() for read-only queries - much faster
      .sort({ date: -1 });
    
    if (limit) {
      savingsQuery = savingsQuery.limit(limit);
    }
    
    const savings = await savingsQuery;
    console.log(`[SAVING GET] Found ${savings.length} savings (shared)`);
    res.json(savings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching savings', error: error.message });
  }
});

// Get saving by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    // All users can see any saving (shared data)
    const saving = await Saving.findById(req.params.id);
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
    // Remove userId from body - data is shared, userId is optional for tracking
    const { userId, ...savingData } = req.body;
    
    // Set userId for tracking who created it, but data is shared
    const saving = new Saving({
      ...savingData,
      userId: req.user._id
    });
    
    console.log(`[SAVING CREATE] User: ${req.user._id} (${req.user.username}), Role: ${req.user.role} (shared data)`);
    
    await saving.save();
    res.status(201).json(saving);
  } catch (error) {
    res.status(400).json({ message: 'Error creating saving', error: error.message });
  }
});

// Update saving
router.put('/:id', authenticate, async (req, res) => {
  try {
    // Remove userId from body - data is shared, any user can update
    const { userId, ...updateData } = req.body;
    
    console.log(`[SAVING UPDATE] User: ${req.user._id} (${req.user.username}), Role: ${req.user.role} (shared data)`);
    
    const saving = await Saving.findByIdAndUpdate(
      req.params.id,
      updateData, // Use sanitized data without userId
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
    // All users can delete any saving (shared data)
    console.log(`[SAVING DELETE] User: ${req.user._id} (${req.user.username}), Role: ${req.user.role} (shared data)`);
    
    const saving = await Saving.findByIdAndDelete(req.params.id);
    if (!saving) {
      return res.status(404).json({ message: 'Saving not found' });
    }
    console.log(`[SAVING DELETE] Deleted saving ${req.params.id}`);
    res.json({ message: 'Saving deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting saving', error: error.message });
  }
});

// Get savings summary
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    // All users see all savings (shared data)
    const query = {};
    
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

