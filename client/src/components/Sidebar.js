import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  FiHome,
  FiDollarSign,
  FiTrendingUp,
  FiTarget,
  FiCreditCard,
  FiSmartphone,
  FiMenu,
  FiX,
  FiLogOut,
  FiList,
  FiAlertCircle
} from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [budgetWarnings, setBudgetWarnings] = useState([]);

  const menuItems = [
    { path: '/', icon: FiHome, label: 'Dashboard' },
    { path: '/transactions', icon: FiList, label: 'Transactions' },
    { path: '/expenses', icon: FiDollarSign, label: 'Expenses' },
    { path: '/income', icon: FiTrendingUp, label: 'Income' },
    { path: '/budgets', icon: FiTarget, label: 'Budgets' },
    { path: '/emis', icon: FiCreditCard, label: 'EMIs' },
    { path: '/upi', icon: FiSmartphone, label: 'UPI Payments' },
  ];

  useEffect(() => {
    const fetchBudgetWarnings = async () => {
      try {
        const response = await axios.get('/budgets');
        const budgets = response.data;
        const overBudget = budgets.filter(budget => {
          const percentage = budget.percentageUsed || 0;
          return percentage > 100;
        });
        setBudgetWarnings(overBudget);
      } catch (error) {
        console.error('Error fetching budget warnings:', error);
      }
    };

    fetchBudgetWarnings();
    // Refresh warnings every 30 seconds
    const interval = setInterval(fetchBudgetWarnings, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleWarningClick = () => {
    navigate('/budgets');
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      <motion.button
        className="mobile-menu-button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        whileTap={{ scale: 0.9 }}
      >
        {sidebarOpen ? <FiX /> : <FiMenu />}
      </motion.button>

      <AnimatePresence>
        {(sidebarOpen || window.innerWidth > 768) && (
          <motion.aside
            initial={{ x: -250 }}
            animate={{ x: 0 }}
            exit={{ x: -250 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="sidebar"
          >
            <div className="sidebar-header">
              <img 
                src="/logo192.png" 
                alt="Spentee Logo" 
                className="sidebar-logo"
                onError={(e) => {
                  // Fallback to text if logo not found
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <h2 style={{ display: 'none' }}>💰 Spentee</h2>
            </div>

            <nav className="sidebar-nav">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                  >
                    <motion.div
                      whileHover={{ x: 5 }}
                      className="nav-item-content"
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </motion.div>
                  </Link>
                );
              })}
              
              {budgetWarnings.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="budget-warning-notification"
                  onClick={handleWarningClick}
                >
                  <motion.div
                    whileHover={{ x: 5 }}
                    className="warning-content"
                  >
                    <FiAlertCircle className="warning-icon" />
                    <span className="warning-text">
                      {budgetWarnings.length} {budgetWarnings.length === 1 ? 'Budget' : 'Budgets'} Over Limit
                    </span>
                  </motion.div>
                </motion.div>
              )}
            </nav>

            <div className="sidebar-footer">
              <button onClick={handleLogout} className="logout-button">
                <FiLogOut />
                <span>Logout</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
