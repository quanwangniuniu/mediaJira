'use client';

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Modal from '@/components/ui/Modal';

const STATUS_LABELS = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function StatusUpdateModal({ 
  isOpen, 
  onClose, 
  currentStatus, 
  newStatus, 
  campaignName, 
  onSubmit 
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(newStatus, reason);
    setSubmitting(false);
    setReason('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2 className="modal-title">Update Status</h2>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-info">
            <p>Change status of <b>{campaignName}</b> from <b>{currentStatus}</b> to <b>{newStatus}</b>.</p>
          </div>
          <label>
            Reason (optional)
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="input"
              placeholder="Reason for status change"
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>Update</button>
          </div>
        </form>
      </div>
    </div>
  );
} 