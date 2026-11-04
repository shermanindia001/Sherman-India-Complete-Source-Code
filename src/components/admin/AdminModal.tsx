'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, AlertCircle, AlertTriangle } from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  isEditing?: boolean;
  loading?: boolean;
  error?: string | null;
  isDirty?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
  saveLabel?: string;
  savingLabel?: string;
  cancelLabel?: string;
  maxWidth?: string;
}

export default function AdminModal({
  isOpen,
  onClose,
  title,
  subtitle,
  isEditing = false,
  loading = false,
  error = null,
  isDirty = false,
  onSubmit,
  children,
  saveLabel,
  savingLabel,
  cancelLabel = 'Cancel',
  maxWidth = 'max-w-xl',
}: AdminModalProps) {
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (loading) return;
        if (isDirty) setShowDiscardConfirm(true);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty, loading, onClose]);

  if (!isOpen) return null;

  const handleAttemptClose = () => {
    if (loading) return;
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const confirmDiscard = () => {
    setShowDiscardConfirm(false);
    onClose();
  };

  const defaultSaveLabel = isEditing ? 'Save Changes' : 'Create Record';
  const defaultSavingLabel = isEditing ? 'Saving Changes...' : 'Creating...';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          handleAttemptClose();
        }
      }}
    >
      <div
        className={`relative w-full ${maxWidth} my-auto bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 leading-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleAttemptClose}
            disabled={loading}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification bar if error */}
        {error && (
          <div className="px-5 sm:px-6 py-3 bg-rose-50 border-b border-rose-100 text-rose-700 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Discard confirmation overlay */}
        {showDiscardConfirm && (
          <div className="p-4 bg-amber-50 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2 text-amber-800 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>You have unsaved changes. Discard and close?</span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-slate-700 font-semibold hover:bg-amber-100/50"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={confirmDiscard}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700"
              >
                Discard Changes
              </button>
            </div>
          </div>
        )}

        {/* Form Body - Scrollable */}
        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 sm:py-5 space-y-4 min-h-0">
            {children}
          </div>

          {/* Sticky Footer - Always visible at bottom */}
          <div className="sticky bottom-0 z-20 px-5 sm:px-6 py-3 sm:py-3.5 border-t border-slate-200/90 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={handleAttemptClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors disabled:opacity-40"
            >
              {cancelLabel}
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 sm:py-2.5 rounded-xl bg-sherman-700 hover:bg-sherman-800 text-white font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{savingLabel || defaultSavingLabel}</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{saveLabel || defaultSaveLabel}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
