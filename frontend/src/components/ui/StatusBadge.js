import React from 'react';

const statusColors = {
  active: 'status-badge-active',
  paused: 'status-badge-paused',
  completed: 'status-badge-completed',
  draft: 'status-badge-draft',
  default: 'status-badge-default',
};

export default function StatusBadge({ status, children }) {
  const className = statusColors[status] || statusColors.default;
  return (
    <span className={`status-badge ${className}`}>{children ?? status}</span>
  );
} 