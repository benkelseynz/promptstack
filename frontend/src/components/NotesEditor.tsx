'use client';

import { useState, useEffect, useRef } from 'react';
import {
  StickyNote,
  Pencil,
  Check,
  X,
  Loader2,
} from 'lucide-react';

interface NotesEditorProps {
  notes: string;
  onSave: (notes: string) => Promise<void>;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
  placeholder?: string;
  maxLength?: number;
}

export default function NotesEditor({
  notes,
  onSave,
  lastUpdatedBy,
  lastUpdatedAt,
  placeholder = 'Add a note for your team...',
  maxLength = 500,
}: NotesEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(notes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(notes);
  }, [notes]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue === notes) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(notes);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isEditing) {
    return (
      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
        <div className="flex items-center gap-2 mb-2">
          <StickyNote className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-800">Team Notes</span>
        </div>
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          className="w-full bg-white border border-amber-300 rounded-lg p-2 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
          rows={3}
          disabled={saving}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-amber-600">
            {editValue.length}/{maxLength}
          </span>
          <div className="flex items-center gap-2">
            {error && (
              <span className="text-xs text-red-600">{error}</span>
            )}
            <button
              onClick={handleCancel}
              disabled={saving}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-amber-100 rounded transition-colors"
              title="Cancel (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="p-1.5 text-amber-700 hover:text-amber-800 hover:bg-amber-100 rounded transition-colors"
              title="Save (Cmd+Enter)"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!notes) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="w-full flex items-center gap-2 p-3 bg-gray-50 hover:bg-amber-50 rounded-lg border border-dashed border-gray-300 hover:border-amber-300 text-gray-400 hover:text-amber-600 transition-colors text-sm"
      >
        <StickyNote className="w-4 h-4" />
        <span>{placeholder}</span>
      </button>
    );
  }

  return (
    <div className="bg-amber-50 rounded-lg p-3 group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <StickyNote className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-amber-800 whitespace-pre-wrap break-words">
              {notes}
            </p>
            {lastUpdatedBy && lastUpdatedAt && (
              <p className="text-xs text-amber-600 mt-1">
                Updated by {lastUpdatedBy} on {formatDate(lastUpdatedAt)}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
          title="Edit notes"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
