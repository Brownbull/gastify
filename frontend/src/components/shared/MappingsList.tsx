/**
 * MappingsList<T> — Generic mapping list component
 *
 * Story 15-3b: Replaces 4 near-identical MappingsList components (2,238 → ~250 lines).
 * Configurable via MappingsListConfig for field access, edit mode, styling, and grouping.
 *
 * @module components/shared/MappingsList
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Trash2, Edit2, X, Check, type LucideIcon } from 'lucide-react';
import { ConfirmationDialog } from './ConfirmationDialog';

// =============================================================================
// Config Types
// =============================================================================

export interface MappingsListConfig<T> {
  /** Extract Firestore document ID */
  getId: (item: T) => string | undefined;
  /** Primary display name (shown in quotes) */
  getDisplayName: (item: T) => string;
  /** Current edit value to populate the edit input */
  getEditValue: (item: T) => string;
  /** Tag label text (e.g., category, original merchant) */
  getTagLabel: (item: T) => string;
  /** Usage count */
  getUsageCount: (item: T) => number;
  /** Message shown in delete confirmation dialog */
  getDeleteMessage: (item: T) => string;

  // UI customization
  emptyIcon: LucideIcon;
  emptyMessageKey: string;
  emptyHintKey?: string;
  deleteConfirmTitleKey: string;
  editTitleKey: string;
  listAriaLabelKey: string;
  editAriaLabelKey: string;
  deleteAriaLabelKey: string;
  tagStyle: { bg: string; darkBg?: string; text: string };
  editGradient: string; // Tailwind classes: e.g., 'from-blue-500 to-blue-600'
  editButtonColor: string; // CSS color for edit icon

  // Edit mode
  editMode: 'text' | 'select';
  selectOptions?: readonly string[];
  editPlaceholderKey?: string;

  // Optional: extra context in edit modal (e.g., merchant name for item mappings)
  getEditContext?: (item: T) => string | undefined;

  // Grouping (ItemNameMappingsList only)
  groupBy?: (item: T) => string;
  groupIcon?: LucideIcon;
  formatGroupLabel?: (key: string) => string;
}

// =============================================================================
// Component Props
// =============================================================================

export interface MappingsListProps<T> {
  mappings: T[];
  loading: boolean;
  onDeleteMapping: (id: string) => Promise<void>;
  onEditMapping: (id: string, newValue: string) => Promise<void>;
  t: (key: string) => string;
  theme?: 'light' | 'dark';
  config: MappingsListConfig<T>;
}

// =============================================================================
// Internal: Edit Modal
// =============================================================================

interface EditModalProps<T> {
  isOpen: boolean;
  item: T | null;
  config: MappingsListConfig<T>;
  onSave: (newValue: string) => void;
  onCancel: () => void;
  t: (key: string) => string;
  theme: 'light' | 'dark';
}

function EditMappingModal<T>({ isOpen, item, config, onSave, onCancel, t, theme }: EditModalProps<T>) {
  const [editValue, setEditValue] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const previousActiveElement = useRef<Element | null>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (isOpen && item) {
      setEditValue(config.getEditValue(item));
      previousActiveElement.current = document.activeElement;
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          if ('select' in inputRef.current && config.editMode === 'text') {
            (inputRef.current as HTMLInputElement).select();
          }
        }
      }, 0);
    }
  }, [isOpen, item, config]);

  const handleClose = useCallback(() => {
    onCancel();
    setTimeout(() => {
      (previousActiveElement.current as HTMLElement)?.focus?.();
    }, 0);
  }, [onCancel]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && item && trimmed !== config.getEditValue(item)) {
      onSave(trimmed);
    } else {
      handleClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && config.editMode === 'text') {
      e.preventDefault();
      handleSave();
    }
  };

  if (!isOpen || !item) return null;

  const editContext = config.getEditContext?.(item);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
      role="presentation"
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-mapping-modal-title"
        className="relative w-full max-w-sm rounded-2xl shadow-xl"
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        onClick={(e) => e.stopPropagation()}
        data-testid="edit-mapping-modal"
      >
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 p-1 rounded-full transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          aria-label={t('close') || 'Close'}
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div className="p-6">
          <div className={`mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br ${config.editGradient} flex items-center justify-center`}>
            <Edit2 size={32} className="text-white" aria-hidden="true" />
          </div>
          <h2 id="edit-mapping-modal-title" className="text-xl font-bold mb-2 text-center">
            {t(config.editTitleKey)}
          </h2>

          {editContext && (
            <p className="text-sm text-center mb-1" style={{ color: 'var(--text-tertiary)' }}>
              {editContext}
            </p>
          )}

          <p className="text-sm text-center mb-4" style={{ color: 'var(--text-secondary)' }}>
            "{config.getDisplayName(item)}"
          </p>

          {config.editMode === 'select' && config.selectOptions ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-4 py-3 rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                color: 'var(--text-primary)',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              }}
              aria-label={t(config.editTitleKey)}
            >
              {config.selectOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={200}
              className="w-full px-4 py-3 rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                color: 'var(--text-primary)',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              }}
              placeholder={config.editPlaceholderKey ? t(config.editPlaceholderKey) : ''}
              aria-label={t(config.editTitleKey)}
            />
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={handleSave}
              disabled={!editValue.trim()}
              className={`w-full py-3 px-4 rounded-xl bg-gradient-to-r ${config.editGradient} text-white font-semibold hover:opacity-90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              data-testid="edit-save-button"
            >
              <Check size={20} aria-hidden="true" />
              {t('save')}
            </button>
            <button
              onClick={handleClose}
              className="w-full py-3 px-4 rounded-xl font-medium transition-colors"
              style={{
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                color: 'var(--text-primary)',
              }}
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Internal: List Item
// =============================================================================

interface ListItemProps<T> {
  item: T;
  isLast: boolean;
  isDark: boolean;
  config: MappingsListConfig<T>;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  editDisabled: boolean;
  deleteDisabled: boolean;
  t: (key: string) => string;
}

function MappingListItem<T>({ item, isLast, isDark, config, onEdit, onDelete, editDisabled, deleteDisabled, t }: ListItemProps<T>) {
  const tagLabel = config.getTagLabel(item);
  const displayLabel = tagLabel.length > 15 ? `${tagLabel.slice(0, 12)}...` : tagLabel;

  return (
    <div
      className="flex items-center justify-between py-2.5"
      style={{ borderBottom: isLast ? 'none' : `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}
      role="listitem"
    >
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
          "{config.getDisplayName(item)}"
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium truncate max-w-[150px]"
            style={{
              backgroundColor: isDark && config.tagStyle.darkBg ? config.tagStyle.darkBg : config.tagStyle.bg,
              color: config.tagStyle.text,
            }}
            title={tagLabel}
          >
            {displayLabel}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {config.getUsageCount(item)}x
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-2">
        <button
          onClick={() => onEdit(item)}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: config.editButtonColor }}
          aria-label={`${t(config.editAriaLabelKey)} "${config.getDisplayName(item)}"`}
          disabled={editDisabled}
        >
          <Edit2 size={16} aria-hidden="true" />
        </button>
        <button
          onClick={() => onDelete(item)}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: '#ef4444' }}
          aria-label={`${t(config.deleteAriaLabelKey)} "${config.getDisplayName(item)}"`}
          disabled={deleteDisabled}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function MappingsList<T>({
  mappings,
  loading,
  onDeleteMapping,
  onEditMapping,
  t,
  theme = 'light',
  config,
}: MappingsListProps<T>) {
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [editTarget, setEditTarget] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const isDark = theme === 'dark';

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const id = config.getId(deleteTarget);
    if (!id) return;

    setDeleting(true);
    try {
      await onDeleteMapping(id);
    } catch (error) {
      console.error('[MappingsList] Delete failed:', error);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleSaveEdit = async (newValue: string) => {
    if (!editTarget) return;
    const id = config.getId(editTarget);
    if (!id) return;

    setEditing(true);
    try {
      await onEditMapping(id, newValue);
    } finally {
      setEditing(false);
      setEditTarget(null);
    }
  };

  // Group mappings if configured
  const groups = useMemo(() => {
    if (!config.groupBy) return null;

    const grouped: Record<string, T[]> = {};
    for (const item of mappings) {
      const key = config.groupBy(item);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }

    return Object.entries(grouped)
      .map(([key, items]) => ({
        key,
        label: config.formatGroupLabel ? config.formatGroupLabel(key) : key,
        items: items.sort((a, b) => config.getUsageCount(b) - config.getUsageCount(a)),
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [mappings, config]);

  // Loading state
  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-12 rounded" style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }} />
        <div className="h-12 rounded" style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }} />
      </div>
    );
  }

  // Empty state
  if (mappings.length === 0) {
    const EmptyIcon = config.emptyIcon;
    return (
      <div className="py-6 text-center" role="status" aria-label={t(config.emptyMessageKey)}>
        <div
          className="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }}
        >
          <EmptyIcon size={24} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
        </div>
        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
          {t(config.emptyMessageKey)}
        </p>
        {config.emptyHintKey && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {t(config.emptyHintKey)}
          </p>
        )}
      </div>
    );
  }

  // Grouped rendering
  if (groups) {
    const GroupIcon = config.groupIcon;
    return (
      <>
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="flex items-center gap-2 mb-2 px-1" style={{ color: 'var(--text-tertiary)' }}>
                {GroupIcon && <GroupIcon size={14} aria-hidden="true" />}
                <span className="text-xs font-medium uppercase tracking-wider">{group.label}</span>
                <span className="text-xs">({group.items.length})</span>
              </div>
              <div role="list">
                {group.items.map((item, index) => (
                  <MappingListItem
                    key={config.getId(item) || index}
                    item={item}
                    isLast={index === group.items.length - 1}
                    isDark={isDark}
                    config={config}
                    onEdit={setEditTarget}
                    onDelete={setDeleteTarget}
                    editDisabled={editing}
                    deleteDisabled={deleting}
                    t={t}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <ConfirmationDialog
          isOpen={!!deleteTarget}
          title={t(config.deleteConfirmTitleKey)}
          message={deleteTarget ? config.getDeleteMessage(deleteTarget) : ''}
          confirmText={t('confirm')}
          cancelText={t('cancel')}
          theme={theme}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          isDestructive
        />

        <EditMappingModal
          isOpen={!!editTarget}
          item={editTarget}
          config={config}
          onSave={handleSaveEdit}
          onCancel={() => setEditTarget(null)}
          t={t}
          theme={theme}
        />
      </>
    );
  }

  // Flat list rendering
  return (
    <>
      <div role="list" aria-label={t(config.listAriaLabelKey)}>
        {mappings.map((item, index) => (
          <MappingListItem
            key={config.getId(item) || index}
            item={item}
            isLast={index === mappings.length - 1}
            isDark={isDark}
            config={config}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
            editDisabled={editing}
            deleteDisabled={deleting}
            t={t}
          />
        ))}
      </div>

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        title={t(config.deleteConfirmTitleKey)}
        message={deleteTarget ? config.getDeleteMessage(deleteTarget) : ''}
        confirmText={t('confirm')}
        cancelText={t('cancel')}
        theme={theme}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDestructive
      />

      <EditMappingModal
        isOpen={!!editTarget}
        item={editTarget}
        config={config}
        onSave={handleSaveEdit}
        onCancel={() => setEditTarget(null)}
        t={t}
        theme={theme}
      />
    </>
  );
}
