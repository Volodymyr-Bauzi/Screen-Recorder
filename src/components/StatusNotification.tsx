import React from 'react';

export const StatusNotification = ({ status }: { status: string }) => {
  if (!status) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#333',
        color: '#fff',
        padding: '8px 12px',
        borderRadius: '4px',
        boxShadow: '0 0 6px rgba(0,0,0,0.3)',
        zIndex: 1000,
      }}
    >
      {status}
    </div>
  );
};
