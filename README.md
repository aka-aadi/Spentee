# 💰 Spendee - Personal Finance Management App

A comprehensive expense tracking and financial management application with a modern web dashboard and mobile app support.

![Spendee](https://img.shields.io/badge/Spendee-Finance%20App-blue)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![React](https://img.shields.io/badge/React-18-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)

## ✨ Features

### Core Features
- 📊 **Comprehensive Dashboard** - Visual overview with multiple charts and statistics
- 💸 **Expense Tracking** - Track and categorize expenses with detailed analytics
- 💰 **Income Management** - Record and monitor income sources
- 🎯 **Budget Management** - Set budgets and track spending against them
- 💳 **EMI Tracking** - Manage loans and monthly installments with payment tracking
- 📱 **UPI Payment Tracking** - Track UPI transactions and categorize them
- 📈 **Advanced Analytics** - Multiple chart types (Pie, Bar, Area, Stacked)
- 🌓 **Dark Theme** - Beautiful dark UI across all platforms
- 🔐 **Admin Access** - Admin users can view and manage all data

### Dashboard Features
- **Available Balance** - Real-time balance after all expenses, EMIs, and down payments
- **Monthly Statistics** - Income, expenses, EMIs, UPI payments overview
- **Expense Breakdown by Category** - Pie chart visualization
- **Monthly Overview** - Bar chart showing income vs expenses
- **Savings Trend** - Area chart tracking savings over time
- **Spending Breakdown** - Stacked bar chart (Expenses, EMI, UPI, Down Payments)

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB Atlas account (or local MongoDB)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/aka-aadi/Spendee.git
   cd Spendee
   ```

2. **Install dependencies:**
   ```bash
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Configure environment variables:**
   
   Create `server/.env`:
   ```env
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-super-secret-jwt-key
   PORT=5000
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your-secure-admin-password
   ```
   
   **Important:** 
   - `ADMIN_PASSWORD` is required for auto-creating admin user on server start
   - `ADMIN_USERNAME` is optional (defaults to 'admin')
   - Never commit `.env` files to version control
   
   Create `client/.env` (optional):
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. **Start the application:**
   ```bash
   # Terminal 1 - Start server
   cd server
   npm start
   
   # Terminal 2 - Start client
   cd client
   npm start
   ```

5. **Access the application:**
   - Web Dashboard: http://localhost:3000
   - API Server: http://localhost:5000

### Admin User Setup

The admin user is automatically created on server start if `ADMIN_PASSWORD` environment variable is set.

**For first-time setup:**
1. Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `server/.env`
2. Start the server - admin will be auto-created
3. Or use the `/api/auth/init` endpoint to create admin manually

**For existing installations:**
- Admin credentials are stored in MongoDB users collection
- Login with the credentials that were set when admin was created
- To reset password, update `ADMIN_PASSWORD` in `.env` and delete existing admin from database, then restart server

## 📁 Project Structure

```
Spendee/
├── server/                 # Backend API (Node.js/Express)
│   ├── index.js           # Main server file
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware (auth)
│   └── package.json
│
├── client/                # Web Dashboard (React)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── context/       # React Context providers
│   │   └── utils/         # Utility functions
│   └── package.json
│
└── README.md              # This file
```

## 🔧 Configuration

### MongoDB Setup
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user
3. Whitelist IP: `0.0.0.0/0` (for development) or specific IPs for production
4. Get connection string: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/spendee?retryWrites=true&w=majority`

### JWT Secret
Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🌐 Deployment

### Server Deployment (Render/Railway/Heroku)
1. Set Root Directory to `server`
2. Set Build Command: `npm install`
3. Set Start Command: `npm start`
4. Add environment variables:
   - `MONGODB_URI` (required)
   - `JWT_SECRET` (required)
   - `PORT` (optional, defaults to 5000)
   - `ADMIN_USERNAME` (optional, defaults to 'admin')
   - `ADMIN_PASSWORD` (required for auto-creating admin)

### Client Deployment (Netlify)
1. Set Base Directory to `client`
2. Set Build Command: `npm install && npm run build`
3. Set Publish Directory: `client/build`
4. Add environment variable: `REACT_APP_API_URL` = your server URL

## 📡 API Endpoints

### Authentication
- `POST /api/auth/init` - Initialize admin user
- `POST /api/auth/login` - User login

### Expenses
- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Create expense
- `GET /api/expenses/:id` - Get expense by ID
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Income
- `GET /api/income` - Get all income entries
- `POST /api/income` - Create income entry
- `PUT /api/income/:id` - Update income
- `DELETE /api/income/:id` - Delete income

### Budgets
- `GET /api/budgets` - Get all budgets
- `POST /api/budgets` - Create budget
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget

### EMIs
- `GET /api/emis` - Get all EMIs
- `POST /api/emis` - Create EMI
- `PUT /api/emis/:id` - Update EMI
- `DELETE /api/emis/:id` - Delete EMI
- `POST /api/emis/:id/pay` - Mark EMI as paid
- `POST /api/emis/:id/unpay` - Unmark EMI payment

### UPI Payments
- `GET /api/upi` - Get all UPI payments
- `POST /api/upi` - Create UPI payment
- `PUT /api/upi/:id` - Update UPI payment
- `DELETE /api/upi/:id` - Delete UPI payment

### Financial Summary
- `GET /api/financial/summary` - Get comprehensive financial summary

## 🔐 Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 👥 User Roles

### Admin Users
- Can view and manage all data (not just their own)
- Automatically created on server start
- Default credentials: `admin` / `chunguchi`

### Regular Users
- Can only view and manage their own data
- Created through the API (future feature)

## 🛠️ Development

### Running in Development Mode
```bash
# Server with auto-reload
cd server
npm run dev

# Client with hot-reload
cd client
npm start
```

### Testing
```bash
# Test server health
curl http://localhost:5000/api/health
```

## 📝 License

ISC

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ using Node.js, Express, React, and MongoDB**
