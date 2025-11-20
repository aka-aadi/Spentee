import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { format } from 'date-fns';
import { FiDollarSign, FiCreditCard, FiSmartphone, FiTrendingUp, FiPiggyBank } from 'react-icons/fi';
import './Transactions.css';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, expense, income, emi, upi

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      // Fetch all expenses (all time)
      const expensesRes = await axios.get('/expenses');

      // Fetch all income (all time)
      const incomeRes = await axios.get('/income');

      // Fetch all UPI payments (successful only, all time)
      const upiRes = await axios.get('/upi');
      const upiPayments = upiRes.data.filter(upi => upi.status === 'Success');

      // Fetch savings (all time)
      const savingsRes = await axios.get('/savings').catch(() => ({ data: [] }));

      // Fetch EMIs and get all paid ones (all time)
      const emisRes = await axios.get('/emis');
      
      // Get all paid EMIs across all months
      const allPaidEMIs = [];
      emisRes.data.forEach(emi => {
        if (emi.paidMonthDates && emi.paidMonthDates.length > 0) {
          emi.paidMonthDates.forEach(paidDateStr => {
            allPaidEMIs.push({
              ...emi,
              paymentDate: paidDateStr
            });
          });
        }
      });

      // Get all down payments (all time, only if included in balance)
      const allDownPaymentEMIs = emisRes.data.filter(emi => {
        if (!emi.downPayment || emi.downPayment <= 0) return false;
        if (emi.includeDownPaymentInBalance === false) return false;
        return true;
      });

      // Combine all transactions
      const allTransactions = [
        ...expensesRes.data.map(exp => ({
          id: exp._id,
          type: 'expense',
          amount: -exp.amount,
          category: exp.category,
          description: exp.description || exp.category,
          date: exp.date,
          createdAt: exp.createdAt || exp.date, // Use createdAt if available, fallback to date
          icon: FiDollarSign,
          color: '#ef4444'
        })),
        ...incomeRes.data.map(inc => ({
          id: inc._id,
          type: 'income',
          amount: inc.amount,
          category: inc.type,
          description: inc.description || inc.type,
          date: inc.date,
          createdAt: inc.createdAt || inc.date, // Use createdAt if available, fallback to date
          icon: FiTrendingUp,
          color: '#10b981'
        })),
        ...upiPayments.map(upi => ({
          id: upi._id,
          type: 'upi',
          amount: -upi.amount,
          category: upi.category,
          description: `${upi.upiApp} - ${upi.recipientName || 'Payment'}`,
          date: upi.date,
          createdAt: upi.createdAt || upi.date, // Use createdAt if available, fallback to date
          icon: FiSmartphone,
          color: '#8b5cf6'
        })),
        ...allPaidEMIs.map(emi => ({
          id: `${emi._id}_emi_${emi.paymentDate}`,
          type: 'emi',
          amount: -emi.monthlyEMI,
          category: emi.category || 'EMI',
          description: `${emi.name} - EMI Payment`,
          date: emi.paymentDate,
          createdAt: emi.paymentDate || emi.createdAt || new Date(), // Use payment date as creation timestamp
          icon: FiCreditCard,
          color: '#f59e0b',
          emiId: emi._id,
          paymentDate: emi.paymentDate
        })),
        ...allDownPaymentEMIs.map(emi => ({
          id: `${emi._id}_downpayment_${emi.startDate}`,
          type: 'downpayment',
          amount: -emi.downPayment,
          category: emi.category || 'Down Payment',
          description: `${emi.name} - Down Payment`,
          date: emi.startDate,
          createdAt: emi.createdAt || emi.startDate, // Use EMI creation timestamp
          icon: FiDollarSign,
          color: '#ec4899',
          emiId: emi._id
        })),
        ...savingsRes.data.map(saving => ({
          id: saving._id,
          type: 'savings',
          amount: -saving.amount,
          category: 'Savings',
          description: saving.description || 'Savings',
          date: saving.date,
          createdAt: saving.createdAt || saving.date,
          icon: FiPiggyBank,
          color: '#3b82f6'
        }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort by creation timestamp (newest first - reverse order)

      setTransactions(allTransactions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setLoading(false);
    }
  };


  const filteredTransactions = filter === 'all' 
    ? transactions 
    : transactions.filter(t => t.type === filter);

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  if (loading) {
    return <div className="loading">Loading transactions...</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="transactions-page"
    >
      <div className="page-header">
        <h1 className="page-title">Transactions</h1>
        <div className="filter-buttons">
          <button 
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={filter === 'expense' ? 'active' : ''}
            onClick={() => setFilter('expense')}
          >
            Expenses
          </button>
          <button 
            className={filter === 'income' ? 'active' : ''}
            onClick={() => setFilter('income')}
          >
            Income
          </button>
          <button 
            className={filter === 'emi' ? 'active' : ''}
            onClick={() => setFilter('emi')}
          >
            EMIs
          </button>
          <button 
            className={filter === 'upi' ? 'active' : ''}
            onClick={() => setFilter('upi')}
          >
            UPI
          </button>
          <button 
            className={filter === 'downpayment' ? 'active' : ''}
            onClick={() => setFilter('downpayment')}
          >
            Down Payments
          </button>
          <button 
            className={filter === 'savings' ? 'active' : ''}
            onClick={() => setFilter('savings')}
          >
            Savings
          </button>
        </div>
      </div>

      <div className="summary-card">
        <h3>Total ({filteredTransactions.length} transactions)</h3>
        <p className={`summary-amount ${totalAmount >= 0 ? 'positive' : 'negative'}`}>
          ₹{Math.abs(totalAmount).toLocaleString()}
        </p>
      </div>

      <div className="transactions-list">
        <AnimatePresence>
          {filteredTransactions.length === 0 ? (
            <div className="empty-state">No transactions found</div>
          ) : (
            filteredTransactions.map((transaction) => {
              const Icon = transaction.icon;
              return (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="transaction-card"
                >
                  <div className="transaction-icon" style={{ background: transaction.color + '20', color: transaction.color }}>
                    <Icon />
                  </div>
                  <div className="transaction-info">
                    <h3>{transaction.description}</h3>
                    <p className="transaction-category">{transaction.category}</p>
                    <p className="transaction-date">{format(new Date(transaction.date), 'MMM dd, yyyy')}</p>
                  </div>
                  <div className="transaction-amount">
                    <span className={`amount ${transaction.amount >= 0 ? 'positive' : 'negative'}`}>
                      {transaction.amount >= 0 ? '+' : ''}₹{Math.abs(transaction.amount).toLocaleString()}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Transactions;

