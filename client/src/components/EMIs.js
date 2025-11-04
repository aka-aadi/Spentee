import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { format, addMonths } from 'date-fns';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiCreditCard, FiCheck, FiMoreVertical, FiXCircle } from 'react-icons/fi';
import './EMIs.css';

const EMIs = () => {
  const [emis, setEmis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEMI, setEditingEMI] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null); // Track which dropdown is open
  const [formData, setFormData] = useState({
    name: '',
    downPayment: '',
    principalAmount: '',
    monthlyEMI: '',
    interestRate: '',
    tenureMonths: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    category: 'Other',
    includeDownPaymentInBalance: true
  });

  useEffect(() => {
    fetchEMIs();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openDropdown]);

  const fetchEMIs = async () => {
    try {
      const response = await axios.get('/emis');
      // Backend sorts by createdAt: -1 (descending - newest first)
      console.log('Fetched EMIs:', response.data.length, response.data); // Debug log
      setEmis(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching EMIs:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const startDate = new Date(formData.startDate);
      // Set to first day of next month after start date for EMI payment to begin
      const nextDueDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
      const endDate = addMonths(startDate, parseInt(formData.tenureMonths));

      const submitData = {
        ...formData,
        downPayment: parseFloat(formData.downPayment || 0),
        principalAmount: parseFloat(formData.principalAmount),
        monthlyEMI: parseFloat(formData.monthlyEMI),
        interestRate: parseFloat(formData.interestRate),
        tenureMonths: parseInt(formData.tenureMonths),
        remainingMonths: parseInt(formData.tenureMonths),
        endDate: format(endDate, 'yyyy-MM-dd'),
        nextDueDate: format(nextDueDate, 'yyyy-MM-dd'),
        startDate: format(startDate, 'yyyy-MM-dd')
      };

      if (editingEMI) {
        await axios.put(`/emis/${editingEMI._id}`, submitData);
      } else {
        await axios.post('/emis', submitData);
      }
      setShowModal(false);
      resetForm();
      fetchEMIs();
    } catch (error) {
      alert('Error saving EMI: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this EMI?')) {
      try {
        await axios.delete(`/emis/${id}`);
        fetchEMIs();
      } catch (error) {
        alert('Error deleting EMI: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handlePay = async (id) => {
    if (window.confirm('Mark this EMI as paid for this month?')) {
      try {
        await axios.post(`/emis/${id}/pay`);
        fetchEMIs();
      } catch (error) {
        alert('Error updating EMI: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleUnpay = async (id) => {
    if (window.confirm('Unmark this EMI payment for this month?')) {
      try {
        await axios.post(`/emis/${id}/unpay`);
        fetchEMIs();
      } catch (error) {
        alert('Error updating EMI: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleEdit = (emi) => {
    setEditingEMI(emi);
    setFormData({
      name: emi.name,
      downPayment: emi.downPayment || '',
      principalAmount: emi.principalAmount,
      monthlyEMI: emi.monthlyEMI,
      interestRate: emi.interestRate,
      tenureMonths: emi.tenureMonths,
      startDate: format(new Date(emi.startDate), 'yyyy-MM-dd'),
      category: emi.category || 'Other',
      includeDownPaymentInBalance: emi.includeDownPaymentInBalance !== undefined ? emi.includeDownPaymentInBalance : true
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      downPayment: '',
      principalAmount: '',
      monthlyEMI: '',
      interestRate: '',
      tenureMonths: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      category: 'Other',
      includeDownPaymentInBalance: true
    });
    setEditingEMI(null);
  };

  const categories = ['Home Loan', 'Car Loan', 'Personal Loan', 'Credit Card', 'Education Loan', 'Other'];

  if (loading) {
    return <div className="loading">Loading EMIs...</div>;
  }

  // Calculate EMIs due in the current month
  const now = new Date();
  // Note: currentMonth and currentYear were removed as they're only used in commented code
  
  // Find the earliest upcoming EMI to determine next month
  // Don't sort - just find the earliest one while maintaining DB order
  let earliestUpcoming = null;
  let earliestDate = null;
  emis.forEach(emi => {
    const dueDate = new Date(emi.nextDueDate);
    if (dueDate >= now && (!earliestDate || dueDate < earliestDate)) {
      earliestDate = dueDate;
      earliestUpcoming = emi;
    }
  });
  
  // Calculate EMIs due in the next month (the month of the earliest upcoming EMI)
  let emisNextMonth = [];
  let totalNextMonth = 0;
  
  if (earliestUpcoming) {
    // Get the month of the earliest upcoming EMI
    const nextUpcomingEMI = earliestUpcoming;
    const nextDueDate = new Date(nextUpcomingEMI.nextDueDate);
    const nextDueMonth = nextDueDate.getMonth();
    const nextDueYear = nextDueDate.getFullYear();
    
    // Find all EMIs due in that same month (keep original DB order - createdAt ascending)
    const firstDayOfNextMonth = new Date(nextDueYear, nextDueMonth, 1);
    const lastDayOfNextMonth = new Date(nextDueYear, nextDueMonth + 1, 0);
    
    // Filter EMIs due in that month - already in creation order from backend
    emisNextMonth = emis.filter(emi => {
      const dueDate = new Date(emi.nextDueDate);
      return dueDate >= firstDayOfNextMonth && dueDate <= lastDayOfNextMonth;
    });
    // Maintain the original order (no sorting - they're already in creation order)
    totalNextMonth = emisNextMonth.reduce((sum, emi) => sum + emi.monthlyEMI, 0);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="emis-page"
    >
      <div className="page-header">
        <h1 className="page-title">EMIs</h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="add-button"
        >
          <FiPlus /> Add EMI
        </motion.button>
      </div>

      <div className="summary-card">
        {emis.length > 0 && emisNextMonth.length > 0 ? (
          <>
            <div className="next-emi-header">
              <h3>Total for {format(new Date(earliestUpcoming ? earliestUpcoming.nextDueDate : (emis[0] ? emis[0].nextDueDate : new Date())), 'MMMM yyyy')}</h3>
              <p className="summary-amount large">₹{totalNextMonth.toLocaleString()}</p>
              <p className="next-emi-count">{emisNextMonth.length} {emisNextMonth.length === 1 ? 'loan' : 'loans'} due</p>
            </div>
            
                  <div className="upcoming-emi-list">
                    <h4 className="upcoming-emi-title">Upcoming EMIs:</h4>
                    <div className="upcoming-emi-grid">
                      {emisNextMonth.map((emi, index) => {
                        // Check if EMI is paid for current month
                        const now = new Date();
                        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                        const isPaidThisMonth = emi.paidMonthDates && emi.paidMonthDates.some(dateStr => {
                          const paidDate = new Date(dateStr);
                          return paidDate.getFullYear() === currentMonth.getFullYear() &&
                                 paidDate.getMonth() === currentMonth.getMonth();
                        });

                        return (
                          <div 
                            key={emi._id || index} 
                            className="upcoming-emi-item"
                            onMouseEnter={(e) => {
                              e.currentTarget.querySelector('.hover-pay-button')?.classList.add('visible');
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.querySelector('.hover-pay-button')?.classList.remove('visible');
                            }}
                          >
                            <div className="upcoming-emi-name">{emi.name}</div>
                            <div className="upcoming-emi-amount">₹{emi.monthlyEMI.toLocaleString()}</div>
                            <div className="upcoming-emi-date">
                              Due: {format(new Date(emi.nextDueDate), 'MMM dd, yyyy')}
                            </div>
                            {emi.remainingMonths > 0 && !isPaidThisMonth && (
                              <button
                                className="hover-pay-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePay(emi._id);
                                }}
                              >
                                <FiCheck /> Mark Paid
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
          </>
        ) : emis.length > 0 ? (
          <>
            <h3>Total Monthly EMI</h3>
            <p className="summary-amount">₹{emis.reduce((sum, emi) => sum + emi.monthlyEMI, 0).toLocaleString()}</p>
          </>
        ) : (
          <>
            <h3>Total Monthly EMI</h3>
            <p className="summary-amount">₹0</p>
          </>
        )}
      </div>

      {emis.length > 0 && (
        <div className="emis-count-header">
          Showing {emis.length} {emis.length === 1 ? 'EMI' : 'EMIs'}
        </div>
      )}

      <div className="emis-list">
        <AnimatePresence>
          {emis.length === 0 ? (
            <div className="empty-state">No EMIs recorded yet. Add your first EMI!</div>
          ) : (
            emis.map((emi) => {
              const progress = (emi.paidMonths / emi.tenureMonths) * 100;
              const daysUntilDue = Math.ceil((new Date(emi.nextDueDate) - new Date()) / (1000 * 60 * 60 * 24));
              
              // Check if EMI is paid for current month
              const now = new Date();
              const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              const isPaidThisMonth = emi.paidMonthDates && emi.paidMonthDates.some(dateStr => {
                const paidDate = new Date(dateStr);
                return paidDate.getFullYear() === currentMonth.getFullYear() &&
                       paidDate.getMonth() === currentMonth.getMonth();
              });
              
              return (
                <motion.div
                  key={emi._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="emi-card"
                >
                  <div className="emi-header">
                    <div className="emi-icon">
                      <FiCreditCard />
                    </div>
                    <div className="emi-info">
                      <h3>{emi.name}</h3>
                      <p className="emi-category">{emi.category}</p>
                    </div>
                    <div className="emi-amount">
                      <span className="emi-monthly">₹{emi.monthlyEMI.toLocaleString()}</span>
                      <span className="emi-label">per month</span>
                    </div>
                  </div>

                  <div className="emi-details">
                    {emi.downPayment > 0 && (
                      <div className="detail-row">
                        <span className="detail-label">Down Payment:</span>
                        <span className="detail-value">₹{emi.downPayment.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="detail-label">Principal Amount:</span>
                      <span className="detail-value">₹{emi.principalAmount.toLocaleString()}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Interest Rate:</span>
                      <span className="detail-value">{emi.interestRate}% p.a.</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Tenure:</span>
                      <span className="detail-value">{emi.tenureMonths} months</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Paid:</span>
                      <span className="detail-value">{emi.paidMonths} / {emi.tenureMonths} months</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Remaining:</span>
                      <span className="detail-value">{emi.remainingMonths} months</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Next Due:</span>
                      <span className={`detail-value ${daysUntilDue <= 7 ? 'due-soon' : ''}`}>
                        {format(new Date(emi.nextDueDate), 'MMM dd, yyyy')}
                        {daysUntilDue <= 7 && daysUntilDue >= 0 && (
                          <span className="due-badge"> ({daysUntilDue} days)</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="emi-progress">
                    <div className="progress-bar">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                        className="progress-fill"
                      />
                    </div>
                    <span className="progress-text">{progress.toFixed(1)}% completed</span>
                  </div>

                  <div className="emi-actions">
                    {emi.remainingMonths > 0 && (
                      isPaidThisMonth ? (
                        <button onClick={() => handleUnpay(emi._id)} className="unpay-button">
                          <FiXCircle /> Unmark Paid
                        </button>
                      ) : (
                        <button onClick={() => handlePay(emi._id)} className="pay-button">
                          <FiCheck /> Mark Paid
                        </button>
                      )
                    )}
                    <div className="dropdown-container">
                      <button 
                        onClick={() => setOpenDropdown(openDropdown === emi._id ? null : emi._id)}
                        className="dropdown-trigger"
                        aria-label="More options"
                      >
                        <FiMoreVertical />
                      </button>
                      {openDropdown === emi._id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="dropdown-menu"
                        >
                          <button 
                            onClick={() => {
                              handleEdit(emi);
                              setOpenDropdown(null);
                            }}
                            className="dropdown-item"
                          >
                            <FiEdit2 /> Edit
                          </button>
                          <button 
                            onClick={() => {
                              handleDelete(emi._id);
                              setOpenDropdown(null);
                            }}
                            className="dropdown-item delete"
                          >
                            <FiTrash2 /> Delete
                          </button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => {
              setShowModal(false);
              resetForm();
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{editingEMI ? 'Edit EMI' : 'Add EMI'}</h2>
                <button onClick={() => {
                  setShowModal(false);
                  resetForm();
                }} className="close-button">
                  <FiX />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="emi-form">
                <div className="form-group">
                  <label>EMI Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., Home Loan, Car Loan"
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Down Payment</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.downPayment}
                    onChange={(e) => setFormData({ ...formData, downPayment: e.target.value })}
                    placeholder="Down payment amount"
                  />
                </div>

                {parseFloat(formData.downPayment || 0) > 0 && (
                  <div className="form-group toggle-group">
                    <label className="toggle-label">Include Down Payment in Balance Calculation</label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, includeDownPaymentInBalance: !formData.includeDownPaymentInBalance })}
                      className={`toggle-button ${formData.includeDownPaymentInBalance ? 'active' : ''}`}
                    >
                      <span className="toggle-text">
                        {formData.includeDownPaymentInBalance ? 'Including' : 'Excluding'}
                      </span>
                      <span className="toggle-switch">
                        <span className="toggle-slider"></span>
                      </span>
                    </button>
                    <p className="toggle-description">
                      {formData.includeDownPaymentInBalance
                        ? 'Down payment will be deducted from your available balance'
                        : 'Down payment will NOT be deducted from your available balance'}
                    </p>
                  </div>
                )}

                <div className="form-group">
                  <label>Principal Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.principalAmount}
                    onChange={(e) => setFormData({ ...formData, principalAmount: e.target.value })}
                    required
                    placeholder="Total loan amount"
                  />
                </div>

                <div className="form-group">
                  <label>Monthly EMI *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monthlyEMI}
                    onChange={(e) => setFormData({ ...formData, monthlyEMI: e.target.value })}
                    required
                    placeholder="Monthly payment amount"
                  />
                </div>

                <div className="form-group">
                  <label>Interest Rate (% p.a.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.interestRate}
                    onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                    required
                    placeholder="Annual interest rate"
                  />
                </div>

                <div className="form-group">
                  <label>Tenure (Months) *</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.tenureMonths}
                    onChange={(e) => setFormData({ ...formData, tenureMonths: e.target.value })}
                    required
                    placeholder="Loan tenure in months"
                  />
                </div>

                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-actions">
                  <button type="button" onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }} className="cancel-button">
                    Cancel
                  </button>
                  <button type="submit" className="submit-button">
                    {editingEMI ? 'Update' : 'Add'} EMI
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default EMIs;
