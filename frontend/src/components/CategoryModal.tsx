'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { X, Loader2, FolderPlus, Palette, AlertCircle } from 'lucide-react';
import type { TeamCategory } from '@/types';

const CATEGORY_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Orange', value: '#F97316' },
];

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  category?: TeamCategory | null;
  onSaved: () => void;
}

export default function CategoryModal({
  isOpen,
  onClose,
  teamId,
  category,
  onSaved,
}: CategoryModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(CATEGORY_COLORS[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!category;

  useEffect(() => {
    if (category) {
      setName(category.name);
      setColor(category.color);
    } else {
      setName('');
      setColor(CATEGORY_COLORS[0].value);
    }
    setError(null);
  }, [category, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    if (name.trim().length > 50) {
      setError('Category name must be 50 characters or less');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && category) {
        await api.updateTeamCategory(teamId, category.id, { name: name.trim(), color });
      } else {
        await api.createTeamCategory(teamId, { name: name.trim(), color });
      }
      onSaved();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setColor(CATEGORY_COLORS[0].value);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">
              {isEditing ? 'Edit Category' : 'Create Category'}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="text-center mb-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: color + '20' }}
              >
                <FolderPlus className="w-8 h-8" style={{ color }} />
              </div>
              <p className="text-gray-600">
                {isEditing
                  ? 'Update the category details'
                  : 'Create a category to organize team prompts'}
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Marketing, Sales, Support"
                  className="input-field"
                  maxLength={50}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Palette className="w-4 h-4 inline mr-1" />
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        color === c.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={handleClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !name.trim()}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {isEditing ? 'Saving...' : 'Creating...'}
                  </>
                ) : isEditing ? (
                  'Save Changes'
                ) : (
                  'Create Category'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
