import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { format } from 'date-fns';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiSave } from 'react-icons/fi';
import './Savings.css';

const Savings = () => {
  const [savings, setSavings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSaving, setEditingSaving] = useState(null);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const fetchAvailableBalance = useCallback(async () => {
    try {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const response = await axios.get('/financial/summary', {
        params: { startDate: firstDay.toISOString(), endDate: lastDay.toISOString() }
      });
      // For editing, we need to add back the current saving amount to available balance
      const currentSavingAmount = editingSaving ? editingSaving.amount : 0;
      setAvailableBalance((response.data.balance?.availableBalance || 0) + currentSavingAmount);
    } catch (error) {
      console.error('Error fetching available balance:', error);
    }
  }, [editingSaving]);

  const fetchSavings = useCallback(async () => {
    try {
      const response = await axios.get('/savings');
      setSavings(response.data.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching savings:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavings();
    fetchAvailableBalance();
  }, [fetchSavings, fetchAvailableBalance]);

  useEffect(() => {
    if (editingSaving) {
      fetchAvailableBalance();
    }
  }, [editingSaving, fetchAvailableBalance]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const amount = parseFloat(formData.amount);
      if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
      }
      
      // For new savings, check against available balance
      // For editing, check against available balance + current saving amount
      const maxAmount = availableBalance;
      if (amount > maxAmount) {
        alert(`Amount cannot exceed available balance of ₹${maxAmount.toLocaleString()}`);
        return;
      }

      if (editingSaving) {
        await axios.put(`/savings/${editingSaving._id}`, {
          amount,
          description: formData.description || 'Savings',
          date: formData.date
        });
      } else {
        await axios.post('/savings', {
          amount,
          description: formData.description || 'Savings',
          date: formData.date
        });
      }
      setShowModal(false);
      resetForm();
      await fetchSavings();
      await fetchAvailableBalance();
    } catch (error) {
      alert('Error saving savings: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this savings entry?')) {
      try {
        await axios.delete(`/savings/${id}`);
        fetchSavings();
        fetchAvailableBalance();
      } catch (error) {
        alert('Error deleting savings: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleEdit = (saving) => {
    setEditingSaving(saving);
    setFormData({
      amount: saving.amount.toString(),
      description: saving.description || '',
      date: format(new Date(saving.date), 'yyyy-MM-dd')
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd')
    });
    setEditingSaving(null);
    fetchAvailableBalance();
  };

  if (loading) {
    return <div className="loading">Loading savings...</div>;
  }

  const totalSavings = savings.reduce((sum, saving) => sum + saving.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="savings-page"
    >
      <div className="page-header">
        <h1 className="page-title">Savings</h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="add-button"
        >
          <FiPlus /> Add Savings
        </motion.button>
      </div>

      <div className="summary-card">
        <h3>Total Savings</h3>
        <p className="summary-amount">₹{totalSavings.toLocaleString()}</p>
      </div>

      <div className="savings-list">
        <AnimatePresence>
          {savings.length === 0 ? (
            <div className="empty-state">No savings recorded yet. Add your first savings!</div>
          ) : (
            savings.map((saving) => (
              <motion.div
                key={saving._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="saving-card"
              >
                <div className="saving-info">
                  <div className="saving-header">
                    <FiSave className="saving-icon" />
                    <h3>Savings</h3>
                    <span className="saving-amount">₹{saving.amount.toLocaleString()}</span>
                  </div>
                  {saving.description && (
                    <p className="saving-description">{saving.description}</p>
                  )}
                  <div className="saving-meta">
                    <span>{format(new Date(saving.date), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
                <div className="saving-actions">
                  <button onClick={() => handleEdit(saving)} className="edit-button">
                    <FiEdit2 />
                  </button>
                  <button onClick={() => handleDelete(saving._id)} className="delete-button">
                    <FiTrash2 />
                  </button>
                </div>
              </motion.div>
            ))
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
                <h2>{editingSaving ? 'Edit Savings' : 'Add Savings'}</h2>
                <button onClick={() => {
                  setShowModal(false);
                  resetForm();
                }} className="close-button">
                  <FiX />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="saving-form">
                <div className="available-balance-info">
                  <p>Available Balance: <span className="balance-amount">₹{availableBalance.toLocaleString()}</span></p>
                </div>

                <div className="form-group">
                  <label>Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={availableBalance}
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    placeholder="Enter amount"
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter description (optional)"
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
                    {editingSaving ? 'Update' : 'Add'} Savings
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

export default Savings;

