import React, { useEffect, useRef, useState } from 'react';
import { Tab } from '../types';
import { Globe, Tag as TagIcon, X, Plus } from 'lucide-react';

interface TabListProps {
  tabs: Tab[];
  selectedIndex: number;
  highlightedTabId: number | null;
  onSelect: (tab: Tab) => void;
  onRemoveTag: (tabId: number, tag: string) => void;
  onRenameTag: (tabId: number, oldTag: string, newTag: string) => void;
  onAddTag: (tabId: number, tag: string) => void;
}

// --- Sub-component for individual Tag management ---
interface TagItemProps {
  tabId: number;
  tag: string;
  isSelectedRow: boolean;
  onRemove: () => void;
  onRename: (newTag: string) => void;
}

const TagItem: React.FC<TagItemProps> = ({ tabId, tag, isSelectedRow, onRemove, onRename }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(tag);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation(); // Prevent navigation in list
    if (e.key === 'Enter') {
      onRename(editValue);
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setEditValue(tag);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    // Save on blur
    if (editValue !== tag) {
        onRename(editValue);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <>
        {/* Fixed Backdrop to swallow clicks outside */}
        <div 
            className="fixed inset-0 z-40 cursor-default" 
            onMouseDown={(e) => {
                e.preventDefault(); // Prevent focus loss first
                e.stopPropagation(); // Stop event from reaching the row
                handleBlur(); // Manually trigger save/close
            }}
        />
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          className="relative z-50 h-[18px] text-[10px] px-1 rounded border border-indigo-300 bg-white outline-none text-slate-700 shadow-sm"
          style={{ width: `${Math.max(tag.length * 7, 50)}px`, maxWidth: '150px' }}
        />
      </>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={`
        group/tag shrink-0 flex items-center gap-1 text-[10px] pl-1.5 pr-1.5 py-0.5 rounded border transition-all cursor-text max-w-[150px]
        ${isSelectedRow 
          ? 'bg-white text-indigo-600 border-indigo-200 shadow-sm' 
          : 'bg-slate-100 text-slate-500 border-slate-200 hover:border-slate-300'
        }
      `}
      title={tag} // Native tooltip for full tag name if truncated
    >
      <TagIcon className="w-2.5 h-2.5 opacity-70 shrink-0" />
      <span className="truncate">{tag}</span>
      
      {/* Hover Actions Container */}
      <div className="flex items-center w-0 overflow-hidden group-hover/tag:w-auto transition-all duration-200 shrink-0">
          {/* Remove Button */}
          <span 
            onClick={(e) => {
                e.stopPropagation();
                onRemove();
            }}
            className="ml-1 p-0.5 hover:bg-slate-200 rounded cursor-pointer"
            title="Remove tag"
          >
            <X className="w-2 h-2 text-slate-400 hover:text-red-500 transition-colors" />
          </span>
      </div>
    </button>
  );
};

// --- Sub-component for Adding a New Tag ---
interface AddTagButtonProps {
  onAdd: (tag: string) => void;
}

const AddTagButton: React.FC<AddTagButtonProps> = ({ onAdd }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);

  const handleSubmit = () => {
    if (value.trim()) {
      onAdd(value.trim());
    }
    setValue('');
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setValue('');
      setIsAdding(false);
    }
  };

  const handleBlur = () => {
    handleSubmit();
  };

  if (isAdding) {
    return (
      <>
        {/* Fixed Backdrop to swallow clicks outside */}
        <div 
            className="fixed inset-0 z-40 cursor-default" 
            onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleBlur();
            }}
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          className="relative z-50 w-[60px] h-[18px] text-[10px] px-1 rounded border border-indigo-300 bg-white outline-none text-slate-700 placeholder:text-slate-300 shadow-sm"
          placeholder="New..."
        />
      </>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setIsAdding(true);
      }}
      className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5 rounded hover:bg-indigo-50 text-slate-300 hover:text-indigo-500"
      title="Add tag"
    >
      <Plus className="w-3 h-3" />
    </button>
  );
};


// --- Main Component ---

const TabList: React.FC<TabListProps> = ({ 
  tabs, 
  selectedIndex, 
  highlightedTabId, 
  onSelect, 
  onRemoveTag,
  onRenameTag,
  onAddTag
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (tabs.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
        <p className="text-sm">No tabs found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar max-h-[400px]" ref={listRef}>
      {tabs.map((tab, index) => {
        const isSelected = index === selectedIndex;
        const isHighlighted = tab.id === highlightedTabId;
        
        return (
          <div
            key={tab.id}
            onClick={() => onSelect(tab)}
            title={`${tab.title} - ${tab.url}`}
            className={`
              group flex items-center gap-3 px-4 py-2 cursor-pointer border-l-2 transition-all duration-200
              ${isHighlighted 
                 ? 'bg-green-50 border-green-500' 
                 : isSelected 
                    ? 'bg-indigo-50/50 border-indigo-500' 
                    : 'border-transparent hover:bg-slate-50'
              }
            `}
          >
            {/* Favicon */}
            <div className="shrink-0 w-4 h-4 flex items-center justify-center rounded bg-white shadow-sm overflow-hidden">
               {tab.favIconUrl ? (
                 <img src={tab.favIconUrl} alt="" className="w-full h-full object-cover" onError={(e) => {
                   (e.target as HTMLImageElement).style.display = 'none';
                 }} />
               ) : (
                 <Globe className="w-2.5 h-2.5 text-slate-400" />
               )}
            </div>

            {/* Content Container - Flex Wrapper */}
            <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
              
              {/* 1. Title Section - Takes available space but won't shrink below 150px if possible */}
              <span className={`truncate min-w-[120px] text-sm ${isSelected ? 'font-medium text-slate-900' : 'text-slate-700'}`}>
                {tab.title}
              </span>
              
              {/* 2. Metadata/Tags Section - Restricted max width to prevent title crush */}
              <div className="flex items-center justify-end gap-1 shrink-0 max-w-[50%]">
                
                {/* Current Badge */}
                {tab.isActive && (
                    <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                    Current
                    </span>
                )}
                
                {/* Tags List - Allows overflow scrolling if needed, but hidden scrollbar keeps it clean */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mask-linear-gradient">
                  {tab.tags.map(tag => (
                      <TagItem 
                          key={tag}
                          tabId={tab.id}
                          tag={tag}
                          isSelectedRow={isSelected}
                          onRemove={() => onRemoveTag(tab.id, tag)}
                          onRename={(newTag) => onRenameTag(tab.id, tag, newTag)}
                      />
                  ))}
                </div>

                {/* Add Tag Button - Always stays visible at the end */}
                <AddTagButton onAdd={(tag) => onAddTag(tab.id, tag)} />
              </div>
            </div>
            
            {/* Hint (Only visible when selected and not highlighted) */}
            {isSelected && !isHighlighted && (
              <div className="shrink-0 text-slate-300 text-xs font-medium pl-1 opacity-50 hidden sm:block">
                ↵
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TabList;