'use client';

import ConnectionTest from '@/components/campaigns/ConnectionTest';

export default function TestPage() {
  return (
    <div className="test-page-bg">
      <div className="container">
        <div className="test-page-header">
          <h1 className="page-title">Connection Test</h1>
          <p className="subtitle">
            Test the connectivity between frontend, backend, and database
          </p>
        </div>
        
        <div className="test-page-content">
          <ConnectionTest />
        </div>
      </div>
    </div>
  );
} 