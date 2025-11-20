import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { format } from 'date-fns';
import Chart from 'react-apexcharts';
import { FiTrendingUp, FiTrendingDown, FiCreditCard, FiDollarSign, FiPlus, FiX, FiSmartphone } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import './Dashboard.css';

const Dashboard = () => {
  const { colors } = useTheme();
  const navigate = useNavigate();
  const [showAddMenu, setShowAddMenu] = useState(false);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAddMenu && !event.target.closest('.fab-container')) {
        setShowAddMenu(false);
      }
    };

    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showAddMenu]);

  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalBudget: 0,
    activeEMIs: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    monthlyEMI: 0,
    availableBalance: 0,
    remainingAfterExpenses: 0,
    totalDownPayments: 0,
    hasExcludedDownPayments: false,
    nextUpcomingEMI: null,
  });
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    try {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Get comprehensive financial summary
      const financialSummary = await axios.get('/financial/summary', {
        params: { startDate: firstDay.toISOString(), endDate: lastDay.toISOString() }
      });

      const { income, expenses, emis, balance, savings } = financialSummary.data;

      // Check if any EMI excludes down payment from balance
      const hasExcludedDownPayments = emis.items.some(emi => 
        emi.includeDownPaymentInBalance === false
      );

      setStats({
        totalIncome: income.total,
        totalExpenses: expenses.totalAll || expenses.total,
        activeEMIs: emis.count,
        monthlyIncome: income.total,
        monthlyExpenses: expenses.totalAll || expenses.total,
        monthlyEMI: emis.totalMonthly,
        totalDownPayments: balance.totalDownPayments || 0,
        totalUPI: balance.totalUPI || 0,
        totalSavings: savings?.total || 0,
        availableBalance: balance.availableBalance || 0,
        remainingAfterExpenses: balance.remainingAfterExpenses,
        hasExcludedDownPayments,
        nextUpcomingEMI: emis.items.length > 0 ? emis.items[0] : null,
      });

      // Include EMI in expenses by category (backend already adds it)
      const categoryData = Object.entries(expenses.byCategory || {}).map(([name, value]) => ({
        name,
        value
      })).sort((a, b) => b.value - a.value);
      setExpensesByCategory(categoryData);

      // Fetch UPI payments for monthly calculation
      const upiResponse = await axios.get('/upi');
      const upiPayments = upiResponse.data.filter(upi => upi.status === 'Success');

      // Generate monthly chart data (last 6 months)
      const monthlyChartData = [];
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const monthExpenses = expenses.items.filter(exp => {
          const expDate = new Date(exp.date);
          return expDate >= month && expDate <= monthEnd;
        }).reduce((sum, exp) => sum + exp.amount, 0);

        // Calculate UPI payments for this month
        const monthUPI = upiPayments.filter(upi => {
          const upiDate = new Date(upi.date);
          return upiDate >= month && upiDate <= monthEnd;
        }).reduce((sum, upi) => sum + upi.amount, 0);

        // Calculate down payments for this month
        const monthDownPayments = emis.items.filter(emi => {
          const emiStartDate = new Date(emi.startDate);
          return emiStartDate >= month && emiStartDate <= monthEnd && 
                 (emi.includeDownPaymentInBalance !== false) && 
                 (emi.downPayment || 0) > 0;
        }).reduce((sum, emi) => sum + (emi.downPayment || 0), 0);

        // Calculate EMI for this month (EMIs due in this month)
        const monthEMI = emis.items.filter(emi => {
          const emiDueDate = new Date(emi.nextDueDate);
          return emiDueDate >= month && emiDueDate <= monthEnd;
        }).reduce((sum, emi) => sum + emi.monthlyEMI, 0);

        const monthIncome = income.items.filter(inc => {
          const incDate = new Date(inc.date);
          return incDate >= month && incDate <= monthEnd;
        }).reduce((sum, inc) => sum + inc.amount, 0);

        const monthSavings = savings?.items?.filter(saving => {
          const savingDate = new Date(saving.date);
          return savingDate >= month && savingDate <= monthEnd;
        }).reduce((sum, saving) => sum + saving.amount, 0) || 0;

        monthlyChartData.push({
          month: format(month, 'MMM'),
          income: monthIncome,
          expenses: monthExpenses,
          emi: monthEMI,
          upi: monthUPI,
          downPayments: monthDownPayments,
          savings: monthSavings,
          totalOutgoing: monthExpenses + monthEMI + monthUPI + monthDownPayments + monthSavings,
          netSavings: monthIncome - monthExpenses - monthEMI - monthUPI - monthDownPayments - monthSavings,
        });
      }
      setMonthlyData(monthlyChartData);

      setLoading(false);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        // Redirect to login after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(err.response?.data?.message || 'Failed to load dashboard data');
      }
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Color palette for charts
  const chartColors = {
    income: '#10b981',      // Green
    expenses: '#ef4444',    // Red
    emi: '#f59e0b',         // Amber
    upi: '#8b5cf6',         // Purple
    downPayments: '#ec4899', // Pink
    savings: '#3b82f6',     // Blue
    category: ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#f97316', '#ec4899']
  };

  if (loading) {
    return <div className="loading" style={{ color: colors.text }}>Loading dashboard...</div>;
  }

  const availableBalance = stats.availableBalance || 0;

  // Pie chart options
  const pieChartOptions = {
    chart: {
      type: 'donut',
      background: 'transparent',
    },
    labels: expensesByCategory.map(cat => cat.name),
    colors: chartColors.category,
    legend: {
      position: 'bottom',
      labels: {
        colors: '#ffffff',
      },
      itemMargin: {
        horizontal: 10,
        vertical: 5
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function (val) {
        return val.toFixed(0) + "%";
      },
      style: {
        colors: ['#ffffff'],
        fontSize: '12px',
        fontWeight: 600
      },
      dropShadow: {
        enabled: false
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '60%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              formatter: function () {
                return '₹' + expensesByCategory.reduce((sum, cat) => sum + cat.value, 0).toLocaleString();
              },
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 600
            }
          }
        }
      }
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return '₹' + val.toLocaleString();
        }
      }
    },
    theme: {
      mode: 'dark'
    }
  };

  const pieChartSeries = expensesByCategory.map(cat => cat.value);

  // Monthly Overview Bar Chart
  const monthlyBarOptions = {
    chart: {
      type: 'bar',
      stacked: false,
      background: 'transparent',
      toolbar: {
        show: false
      },
      responsive: [{
        breakpoint: 768,
        options: {
          chart: {
            height: 300
          },
          dataLabels: {
            fontSize: '10px'
          }
        }
      }, {
        breakpoint: 480,
        options: {
          chart: {
            height: 250
          },
          dataLabels: {
            fontSize: '9px',
            enabled: true,
            formatter: function (val) {
              // Show abbreviated amounts on very small screens
              if (val >= 1000) {
                return '₹' + (val / 1000).toFixed(1) + 'k';
              }
              return '₹' + val.toLocaleString();
            }
          }
        }
      }]
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 4
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function (val) {
        return '₹' + val.toLocaleString();
      },
      style: {
        colors: ['#ffffff'],
        fontSize: window.innerWidth <= 480 ? '9px' : window.innerWidth <= 768 ? '10px' : '12px',
        fontWeight: 600
      },
      offsetY: window.innerWidth <= 480 ? -3 : -5,
      dropShadow: {
        enabled: true,
        color: '#000000',
        blur: 3,
        opacity: 0.5
      }
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent']
    },
    xaxis: {
      categories: monthlyData.map(d => d.month),
      labels: {
        style: {
          colors: '#ffffff'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#ffffff'
        },
        formatter: function (val) {
          return '₹' + val.toLocaleString();
        }
      }
    },
    fill: {
      opacity: 1
    },
    colors: [chartColors.income, chartColors.expenses, chartColors.emi],
    legend: {
      position: 'bottom',
      labels: {
        colors: '#ffffff'
      }
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return '₹' + val.toLocaleString();
        }
      }
    },
    grid: {
      borderColor: '#1a1a1a',
      strokeDashArray: 4
    },
    theme: {
      mode: 'dark'
    }
  };

  const monthlyBarSeries = [
    {
      name: 'Income',
      data: monthlyData.map(d => d.income)
    },
    {
      name: 'Total Expenses',
      data: monthlyData.map(d => d.totalOutgoing)
    },
    {
      name: 'EMI',
      data: monthlyData.map(d => d.emi)
    }
  ];

  // Savings Trend Area Chart
  const savingsAreaOptions = {
    chart: {
      type: 'area',
      background: 'transparent',
      toolbar: {
        show: false
      },
      sparkline: {
        enabled: false
      }
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 90, 100]
      }
    },
    colors: [chartColors.savings, chartColors.income],
    xaxis: {
      categories: monthlyData.map(d => d.month),
      labels: {
        style: {
          colors: '#ffffff'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#ffffff'
        },
        formatter: function (val) {
          return '₹' + val.toLocaleString();
        }
      }
    },
    legend: {
      position: 'bottom',
      labels: {
        colors: '#ffffff'
      }
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return '₹' + val.toLocaleString();
        }
      }
    },
    grid: {
      borderColor: '#1a1a1a',
      strokeDashArray: 4
    },
    theme: {
      mode: 'dark'
    }
  };

  const savingsAreaSeries = [
    {
      name: 'Net Savings',
      data: monthlyData.map(d => Math.max(0, d.netSavings || 0))
    },
    {
      name: 'Income',
      data: monthlyData.map(d => d.income)
    }
  ];

  // Spending Breakdown Stacked Bar Chart
  const spendingBreakdownOptions = {
    chart: {
      type: 'bar',
      stacked: true,
      background: 'transparent',
      toolbar: {
        show: false
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 4
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function (val) {
        // Only show label if value is greater than 0 to avoid clutter
        return val > 0 ? '₹' + val.toLocaleString() : '';
      },
      style: {
        colors: ['#ffffff'],
        fontSize: '11px',
        fontWeight: 600
      },
      offsetY: -5,
      dropShadow: {
        enabled: true,
        color: '#000000',
        blur: 3,
        opacity: 0.5
      }
    },
    colors: [chartColors.expenses, chartColors.emi, chartColors.upi, chartColors.downPayments, chartColors.savings],
    xaxis: {
      categories: monthlyData.map(d => d.month),
      labels: {
        style: {
          colors: '#ffffff'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#ffffff'
        },
        formatter: function (val) {
          return '₹' + val.toLocaleString();
        }
      }
    },
    legend: {
      position: 'bottom',
      labels: {
        colors: '#ffffff'
      }
    },
    fill: {
      opacity: 1
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return '₹' + val.toLocaleString();
        }
      }
    },
    grid: {
      borderColor: '#1a1a1a',
      strokeDashArray: 4
    },
    theme: {
      mode: 'dark'
    }
  };

  const spendingBreakdownSeries = [
    {
      name: 'Expenses',
      data: monthlyData.map(d => d.expenses)
    },
    {
      name: 'EMI',
      data: monthlyData.map(d => d.emi)
    },
    {
      name: 'UPI',
      data: monthlyData.map(d => d.upi)
    },
    {
      name: 'Down Payments',
      data: monthlyData.map(d => d.downPayments)
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="dashboard"
    >
      <h1 className="page-title">Financial Overview</h1>

      {error && <div className="error-banner">{error}</div>}

      {/* Main Financial Summary Section */}
      <div className="dashboard-summary">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="summary-card main-balance"
        >
          <div className="summary-header">
            <div className="summary-label">Available Balance</div>
          </div>
          <div className={`summary-value ${availableBalance < 0 ? 'negative' : ''}`}>
            ₹{availableBalance.toLocaleString()}
          </div>
          <div className="summary-detail">
            After all expenses, EMIs, and down payments (per EMI settings)
            {stats.hasExcludedDownPayments && (
              <span className="downpayment-note">
                {' '}(Some EMIs exclude down payments)
              </span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Income & Expenses Section */}
      <div className="stats-section">
        <h2 className="section-title">This Month</h2>
        <div className="stats-grid">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="stat-card income"
          >
            <div className="stat-icon">
              <FiTrendingUp />
            </div>
            <div className="stat-content">
              <h3>Income</h3>
              <p className="stat-value">₹{stats.monthlyIncome.toLocaleString()}</p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="stat-card expense"
          >
            <div className="stat-icon">
              <FiTrendingDown />
            </div>
            <div className="stat-content">
              <h3>Total Expenses</h3>
              <p className="stat-value">₹{stats.monthlyExpenses.toLocaleString()}</p>
              <span className="stat-subtitle">Includes expenses, EMIs, down payments & UPI</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* EMIs Section */}
      {stats.activeEMIs > 0 && (
        <div className="stats-section">
          <h2 className="section-title">Loan Obligations</h2>
          <div className="stats-grid">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="stat-card emi"
            >
              <div className="stat-icon">
                <FiCreditCard />
              </div>
              <div className="stat-content">
                <h3>Monthly EMI</h3>
                <p className="stat-value">₹{stats.monthlyEMI.toLocaleString()}</p>
                <span className="stat-subtitle">{stats.activeEMIs} active {stats.activeEMIs === 1 ? 'loan' : 'loans'}</span>
              </div>
            </motion.div>

            {stats.totalDownPayments > 0 && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="stat-card downpayment"
              >
                <div className="stat-icon">
                  <FiDollarSign />
                </div>
                <div className="stat-content">
                  <h3>Down Payments</h3>
                  <p className="stat-value">₹{stats.totalDownPayments.toLocaleString()}</p>
                  <span className="stat-subtitle">Already paid</span>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      <div className="charts-grid">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="chart-card"
        >
          <h3>Expenses & EMI by Category</h3>
          {expensesByCategory.length > 0 ? (
            <Chart
              options={pieChartOptions}
              series={pieChartSeries}
              type="donut"
              height={window.innerWidth <= 480 ? 250 : window.innerWidth <= 768 ? 300 : 350}
            />
          ) : (
            <div className="empty-state">No expense data available</div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="chart-card"
        >
          <h3>Monthly Overview</h3>
          {monthlyData.length > 0 ? (
            <Chart
              options={monthlyBarOptions}
              series={monthlyBarSeries}
              type="bar"
              height={window.innerWidth <= 480 ? 250 : window.innerWidth <= 768 ? 300 : 350}
            />
          ) : (
            <div className="empty-state">No data available</div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="chart-card"
        >
          <h3>Savings Trend</h3>
          {monthlyData.length > 0 ? (
            <Chart
              options={savingsAreaOptions}
              series={savingsAreaSeries}
              type="area"
              height={window.innerWidth <= 480 ? 250 : window.innerWidth <= 768 ? 300 : 350}
            />
          ) : (
            <div className="empty-state">No data available</div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="chart-card"
        >
          <h3>Spending Breakdown</h3>
          {monthlyData.length > 0 ? (
            <Chart
              options={spendingBreakdownOptions}
              series={spendingBreakdownSeries}
              type="bar"
              height={window.innerWidth <= 480 ? 250 : window.innerWidth <= 768 ? 300 : 350}
            />
          ) : (
            <div className="empty-state">No data available</div>
          )}
        </motion.div>
      </div>

      {/* Floating Action Button */}
      <motion.div
        className="fab-container"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.6 }}
      >
        <AnimatePresence>
          {showAddMenu && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fab-menu"
            >
              <button
                onClick={() => {
                  navigate('/expenses');
                  setShowAddMenu(false);
                }}
                className="fab-menu-item"
              >
                <FiDollarSign /> Add Expense
              </button>
              <button
                onClick={() => {
                  navigate('/income');
                  setShowAddMenu(false);
                }}
                className="fab-menu-item"
              >
                <FiTrendingUp /> Add Income
              </button>
              <button
                onClick={() => {
                  navigate('/emis');
                  setShowAddMenu(false);
                }}
                className="fab-menu-item"
              >
                <FiCreditCard /> Add EMI
              </button>
              <button
                onClick={() => {
                  navigate('/upi');
                  setShowAddMenu(false);
                }}
                className="fab-menu-item"
              >
                <FiSmartphone /> Add UPI Payment
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="fab-button"
        >
          {showAddMenu ? <FiX /> : <FiPlus />}
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
