import React from 'react';
import './StatusBadge.css';

const CONFIG = {
  working: { label: 'Working',          icon: '✓', cls: 'working' },
  wip:     { label: 'Work in Progress', icon: '⚡', cls: 'wip'     },
  soon:    { label: 'Coming Soon',      icon: '⏳', cls: 'soon'    },
};

export default function StatusBadge({ status }) {
  const { label, icon, cls } = CONFIG[status] ?? CONFIG.soon;
  return (
    <span className={`status-badge status-badge--${cls}`}>
      <span className="status-badge__icon">{icon}</span>
      {label}
    </span>
  );
}
