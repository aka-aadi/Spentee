const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not defined in .env file');
  console.error('Please create a .env file in the server directory with your MongoDB Atlas connection string');
  console.error('Example: MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/spendee?retryWrites=true&w=majority');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
.then(() => console.log('MongoDB connected successfully'))
.catch(err => {
  console.error('MongoDB connection error:', err.message);
  console.error('Please check your MONGODB_URI in the .env file');
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/income', require('./routes/income'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/emis', require('./routes/emis'));
app.use('/api/upi', require('./routes/upi'));
app.use('/api/financial', require('./routes/financial'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Spendee API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
