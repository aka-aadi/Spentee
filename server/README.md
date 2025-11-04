# SpenTee Server API

Backend API server for the SpenTee expense tracking application.

## 🚀 Features

- User authentication with JWT
- Expense tracking and management
- Income tracking
- Budget management
- EMI (Equated Monthly Installment) tracking
- UPI payment tracking
- Comprehensive financial summaries

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB Atlas account (or local MongoDB instance)

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd spendee/server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your MongoDB connection string and JWT secret:
   ```env
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-jwt-secret-key
   PORT=5000
   ```

4. **Run the server:**
   ```bash
   # Development mode (with auto-reload)
   npm run dev
   
   # Production mode
   npm start
   ```

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
- `GET /api/income/:id` - Get income by ID
- `PUT /api/income/:id` - Update income
- `DELETE /api/income/:id` - Delete income

### Budgets
- `GET /api/budgets` - Get all budgets
- `POST /api/budgets` - Create budget
- `GET /api/budgets/:id` - Get budget by ID
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget

### EMIs
- `GET /api/emis` - Get all EMIs
- `POST /api/emis` - Create EMI
- `GET /api/emis/:id` - Get EMI by ID
- `PUT /api/emis/:id` - Update EMI
- `DELETE /api/emis/:id` - Delete EMI
- `POST /api/emis/:id/pay` - Mark EMI as paid
- `POST /api/emis/:id/unpay` - Unmark EMI payment

### UPI Payments
- `GET /api/upi` - Get all UPI payments
- `POST /api/upi` - Create UPI payment
- `GET /api/upi/:id` - Get UPI payment by ID
- `PUT /api/upi/:id` - Update UPI payment
- `DELETE /api/upi/:id` - Delete UPI payment

### Financial Summary
- `GET /api/financial/summary` - Get comprehensive financial summary

### Health Check
- `GET /api/health` - Server health check

## 🔐 Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 🌍 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `PORT` | Server port (default: 5000) | No |
| `NODE_ENV` | Environment (development/production) | No |

## 📦 Project Structure

```
server/
├── index.js              # Main server file
├── package.json          # Dependencies and scripts
├── .env.example          # Environment variables template
├── Procfile              # For Heroku deployment
├── models/               # Mongoose models
│   ├── User.js
│   ├── Expense.js
│   ├── Income.js
│   ├── Budget.js
│   ├── EMI.js
│   └── UPIPayment.js
├── routes/               # API routes
│   ├── auth.js
│   ├── expenses.js
│   ├── income.js
│   ├── budgets.js
│   ├── emis.js
│   ├── upi.js
│   └── financial.js
└── middleware/           # Custom middleware
    └── auth.js
```

## 🚀 Deployment

This server is ready to deploy on:
- **Render.com** (recommended - free tier available)
- **Railway.app** (great free tier)
- **Fly.io** (global edge network)
- **Heroku** (paid, but very reliable)

See the main `DEPLOYMENT_GUIDE.md` in the root directory for detailed deployment instructions.

### Quick Deploy Checklist:

1. ✅ Push code to GitHub
2. ✅ Set up MongoDB Atlas cluster
3. ✅ Create `.env` file with required variables (or use platform's environment variables)
4. ✅ Deploy to your chosen platform
5. ✅ Update mobile app with production API URL

## 🧪 Testing

Test the health endpoint:
```bash
curl https://your-server-url.com/api/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "SpenTee API is running"
}
```

## 📝 License

ISC

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
