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
.then(async () => {
  console.log('MongoDB connected successfully');
  
  // Auto-initialize admin user on server start (if environment variables are set)
  try {
    const User = require('./models/User');
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (adminPassword) {
      const adminExists = await User.findOne({ username: adminUsername });
      if (!adminExists) {
        const admin = new User({
          username: adminUsername,
          password: adminPassword,
          role: 'admin'
        });
        await admin.save();
        console.log(`✅ Admin user "${adminUsername}" created successfully`);
      } else {
        // Ensure existing admin has admin role
        if (adminExists.role !== 'admin') {
          adminExists.role = 'admin';
          await adminExists.save();
          console.log(`✅ Admin user "${adminUsername}" role updated to admin`);
        } else {
          console.log(`ℹ️  Admin user "${adminUsername}" already exists`);
        }
      }
    } else {
      console.log('ℹ️  ADMIN_PASSWORD not set - skipping admin auto-creation');
      console.log('   Admin user must be created manually or via /api/auth/init endpoint');
    }
  } catch (error) {
    console.error('Error initializing admin:', error.message);
  }
})
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
