import React from 'react';
import { CheckCircle, AlertCircle, Info, Star, X } from 'lucide-react';

export default function ToastNotification({ toast, onClose }) {
  if (!toast) return null;

  const icons = {
    success: <CheckCircle size={22} style={{ color: '#10b981' }} />,
    error: <AlertCircle size={22} style={{ color: '#ef4444' }} />,
    warning: <AlertCircle size={22} style={{ color: '#f59e0b' }} />,
    star: <Star size={22} fill="#f59e0b" style={{ color: '#d97706' }} />,
    info: <Info size={22} style={{ color: '#2563eb' }} />
  };

  const bgColors = {
    success: '#ecfdf5',
    error: '#fef2f2',
    warning: '#fffbe6',
    star: '#fffbe6',
    info: '#eff6ff'
  };

  const borderColors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    star: '#f59e0b',
    info: '#2563eb'
  };

  const toastTextColor = '#17352f';
  const toastMutedColor = '#48645d';

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 9999,
        background: bgColors[toast.type] || 'var(--bg-card)',
        border: `2px solid ${borderColors[toast.type] || 'var(--primary)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        maxWidth: 440,
        minWidth: 300,
        animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div>{icons[toast.type] || icons.info}</div>

      <div style={{ flex: 1 }}>
        {toast.title && (
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: toastTextColor, marginBottom: 2 }}>
            {toast.title}
          </div>
        )}
        <div style={{ fontSize: '0.9rem', color: toastMutedColor, lineHeight: 1.4 }}>
          {toast.message}
        </div>
      </div>

      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: toastMutedColor,
          cursor: 'pointer',
          padding: 4
        }}
      >
        <X size={18} />
      </button>

      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
