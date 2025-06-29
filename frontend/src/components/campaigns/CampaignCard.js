'use client';

import React from 'react';
import { useState } from 'react';
import { 
  CalendarIcon, 
  CurrencyDollarIcon, 
  UserIcon,
  EllipsisVerticalIcon,
  PlayIcon,
  PauseIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import DropdownMenu from '@/components/ui/DropdownMenu';
import StatusUpdateModal from './StatusUpdateModal';

export default function CampaignCard({ campaign, onStatusUpdate }) {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'green';
      case 'paused': return 'yellow';
      case 'completed': return 'blue';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return PlayIcon;
      case 'paused': return PauseIcon;
      case 'completed': return CheckIcon;
      case 'cancelled': return XMarkIcon;
      default: return null;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const handleStatusChange = (newStatus) => {
    setSelectedStatus(newStatus);
    setShowStatusModal(true);
  };

  const handleStatusUpdate = async (reason) => {
    await onStatusUpdate(campaign.id, selectedStatus, reason);
    setShowStatusModal(false);
  };

  const menuItems = [
    {
      label: 'View Details',
      onClick: () => window.location.href = `/campaigns/${campaign.id}`,
    },
    {
      label: 'Edit Campaign',
      onClick: () => window.location.href = `/campaigns/${campaign.id}/edit`,
    },
    {
      label: 'View Metrics',
      onClick: () => window.location.href = `/campaigns/${campaign.id}/metrics`,
    },
    { type: 'divider' },
    ...(campaign.status === 'draft' ? [
      {
        label: 'Activate',
        onClick: () => handleStatusChange('active'),
        icon: PlayIcon,
      }
    ] : []),
    ...(campaign.status === 'active' ? [
      {
        label: 'Pause',
        onClick: () => handleStatusChange('paused'),
        icon: PauseIcon,
      },
      {
        label: 'Complete',
        onClick: () => handleStatusChange('completed'),
        icon: CheckIcon,
      }
    ] : []),
    ...(campaign.status === 'paused' ? [
      {
        label: 'Resume',
        onClick: () => handleStatusChange('active'),
        icon: PlayIcon,
      }
    ] : []),
    ...(['draft', 'active', 'paused'].includes(campaign.status) ? [
      {
        label: 'Cancel',
        onClick: () => handleStatusChange('cancelled'),
        icon: XMarkIcon,
        className: 'text-red-600',
      }
    ] : []),
  ];

  return (
    <div className="campaign-card">
      <div className="campaign-card-header">
        <h2 className="campaign-title">{campaign.name}</h2>
        <StatusBadge status={campaign.status} />
      </div>
      <div className="campaign-details">
        <div><span className="label">Type:</span> {campaign.campaign_type}</div>
        <div><span className="label">Start:</span> {campaign.start_date}</div>
        <div><span className="label">End:</span> {campaign.end_date}</div>
        <div><span className="label">Budget:</span> ${campaign.budget}</div>
      </div>
      <div className="campaign-actions">
        <button className="btn btn-secondary" onClick={() => onStatusUpdate(campaign.id, 'paused')}>Pause</button>
        <button className="btn btn-secondary" onClick={() => onStatusUpdate(campaign.id, 'active')}>Activate</button>
        <button className="btn btn-secondary" onClick={() => onStatusUpdate(campaign.id, 'completed')}>Complete</button>
      </div>
    </div>
  );
} 