'use client';

import React from 'react';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  ClockIcon, 
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

export default function DashboardStats({ stats }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statCards = [
    {
      title: 'Total Campaigns',
      value: stats.total_campaigns,
      icon: ChartBarIcon,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
    },
    {
      title: 'Active Campaigns',
      value: stats.active_campaigns,
      icon: ChartBarIcon,
      color: 'bg-green-500',
      textColor: 'text-green-600',
    },
    {
      title: 'Total Budget',
      value: formatCurrency(stats.total_budget),
      icon: CurrencyDollarIcon,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
    },
    {
      title: 'Budget Spent',
      value: formatCurrency(stats.total_spent),
      icon: CurrencyDollarIcon,
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
    },
    {
      title: 'Soon Ending',
      value: stats.soon_ending,
      icon: ClockIcon,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
    },
    {
      title: 'Over Budget',
      value: stats.over_budget,
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500',
      textColor: 'text-red-600',
    },
  ];

  return (
    <div className="dashboard-stats">
      {statCards.map((stat, index) => (
        <div key={index} className="dashboard-stat">
          <div className="stat-label">{stat.title}</div>
          <div className="stat-value">{stat.value}</div>
        </div>
      ))}
    </div>
  );
} 