'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { TagList } from './tag-badge';
import { cn } from '@/lib/utils';

interface TagManagerProps {
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  availableTags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
  isLoading?: boolean;
}

export default function TagManager({ 
  tags, 
  availableTags, 
  onAddTag, 
  onRemoveTag, 
  isLoading = false 
}: TagManagerProps) {
  const [isAddingTag, setIsAddingTag] = useState(false);
  
  const handleAddTag = (tagId: string) => {
    onAddTag(tagId);
    setIsAddingTag(false);
  };
  
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <span>Tags</span>
          {isLoading && (
            <span className="text-xs text-zinc-400 font-normal">(loading...)</span>
          )}
        </div>
        {availableTags.length > 0 && (
          <button
            type="button"
            onClick={() => setIsAddingTag(!isAddingTag)}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            disabled={isLoading}
          >
            <Plus size={12} />
            Add Tag
          </button>
        )}
      </div>
      
      {tags.length > 0 ? (
        <TagList 
          tags={tags} 
          onTagRemove={onRemoveTag}
          className="mb-3"
        />
      ) : (
        <p className="text-zinc-400 text-sm mb-3">No tags added yet</p>
      )}
      
      {isAddingTag && availableTags.length > 0 && (
        <div className="relative">
          <div className="absolute z-10 mt-1 w-full max-w-xs bg-white rounded-lg border border-zinc-200 shadow-lg overflow-hidden">
            <div className="p-2 border-b border-zinc-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-700">Select a tag</span>
                <button
                  type="button"
                  onClick={() => setIsAddingTag(false)}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleAddTag(tag.id)}
                  className="w-full text-left px-3 py-2 hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <span 
                      className={cn(
                        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                        tag.color === 'gray' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                        tag.color === 'red' ? 'bg-red-100 text-red-800 border-red-300' :
                        tag.color === 'orange' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                        tag.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                        tag.color === 'green' ? 'bg-green-100 text-green-800 border-green-300' :
                        tag.color === 'blue' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                        tag.color === 'indigo' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' :
                        tag.color === 'purple' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                        tag.color === 'pink' ? 'bg-pink-100 text-pink-800 border-pink-300' :
                        'bg-gray-100 text-gray-800 border-gray-300'
                      )}
                    >
                      {tag.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {availableTags.length === 0 && !isAddingTag && (
        <p className="text-xs text-zinc-400 mt-1">No more tags available to add</p>
      )}
    </div>
  );
}
