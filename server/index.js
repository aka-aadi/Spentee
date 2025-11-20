const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const MongoStore = require('connect-mongo');

dotenv.config();

const app = express();

// Database connection - must be established before session store
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not defined in .env file');
  console.error('Please create a .env file in the server directory with your MongoDB Atlas connection string');
  console.error('Example: MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/spendee?retryWrites=true&w=majority');
  process.exit(1);
}

// Session configuration
const sessionSecret = process.env.SESSION_SECRET || 'your-session-secret-change-in-production';
const sessionMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Create session store with MongoDB connection
const sessionStore = MongoStore.create({
  mongoUrl: MONGODB_URI,
  ttl: sessionMaxAge / 1000, // TTL in seconds
  touchAfter: 24 * 3600 // lazy session update (24 hours)
});

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    // For production (Render + Netlify both HTTPS), we need secure: true and sameSite: 'none'
    // For local development, you can set FORCE_SECURE_COOKIES=false to use lax
    secure: process.env.FORCE_SECURE_COOKIES !== 'false', // Default to true (required for cross-origin with sameSite: 'none')
    httpOnly: true, // Prevent client-side JavaScript access
    maxAge: sessionMaxAge,
    sameSite: process.env.FORCE_SECURE_COOKIES === 'false' ? 'lax' : 'none', // 'none' for cross-origin (requires secure: true)
    domain: undefined // Don't restrict domain - let browser handle it
  },
  name: 'spentee.sid' // Custom session name
}));

// Middleware
// CORS configuration - must allow credentials for cookies to work cross-origin
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In production, you might want to whitelist specific origins
    // For now, allow all origins (you can restrict this later)
    callback(null, true);
  },
  credentials: true, // REQUIRED: Allow cookies to be sent cross-origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
  exposedHeaders: ['Set-Cookie']
}));
app.use(express.json());

// Request logging middleware (for debugging)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    headers: {
      'x-session-id': req.headers['x-session-id'],
      'content-type': req.headers['content-type'],
      'cookie': req.headers.cookie ? 'present' : 'missing',
      'origin': req.headers.origin,
      'referer': req.headers.referer
    }
  });
  next();
});

// Connect to MongoDB
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
  res.json({ status: 'OK', message: 'Spentee API is running' });
});

// Error handling middleware - must be after all routes
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  console.error('Error stack:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
