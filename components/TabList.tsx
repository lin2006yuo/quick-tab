import React, { useEffect, useRef, useState } from 'react';
import { Tab } from '../types';
import { Globe, Tag as TagIcon, X, Plus, ArrowUp, ArrowDown, Star, LayoutGrid, Pencil, GripVertical } from 'lucide-react';

interface TabListProps {
  tabs: Tab[];
  selectedIndex: number;
  highlightedTabId: number | null;
  onSelect: (tab: Tab) => void;
  onRemoveTag: (tabId: number, tag: string) => void;
  onRenameTag: (tabId: number, oldTag: string, newTag: string) => void;
  onAddTag: (tabId: number, tag: string) => void;
  onRenameTab: (tabId: number, newTitle: string) => void;
  onTogglePin: (tabId: number) => void;
  onEditEnd: () => void;
  onReorderPinnedTabs: (fromId: number, toId: number | 'END') => void;
}

// --- Sub-component for individual Tag management ---
interface TagItemProps {
  tabId: number;
  tag: string;
  isSelectedRow: boolean;
  onRemove: () => void;
  onRename: (newTag: string) => void;
  onEditEnd: () => void;
}

const TagItem: React.FC<TagItemProps> = ({ tabId, tag, isSelectedRow, onRemove, onRename, onEditEnd }) => {
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
      onEditEnd();
    } else if (e.key === 'Escape') {
      setEditValue(tag);
      setIsEditing(false);
      onEditEnd();
    }
  };

  const handleBlur = () => {
    // Save on blur
    if (editValue !== tag) {
        onRename(editValue);
    }
    setIsEditing(false);
    onEditEnd();
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
            onMouseDown={(e) => e.preventDefault()} // Prevent focus loss on main input
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
  onEditEnd: () => void;
}

const AddTagButton: React.FC<AddTagButtonProps> = ({ onAdd, onEditEnd }) => {
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
    onEditEnd();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setValue('');
      setIsAdding(false);
      onEditEnd();
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
      onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
      className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5 rounded hover:bg-indigo-50 text-slate-300 hover:text-indigo-500"
      title="Add tag"
    >
      <Plus className="w-3 h-3" />
    </button>
  );
};

// --- Sub-component for Editable Title ---
interface TitleItemProps {
    title: string;
    isSelected: boolean;
    onRename: (newTitle: string) => void;
    onEditEnd: () => void;
}

const TitleItem: React.FC<TitleItemProps> = ({ title, isSelected, onRename, onEditEnd }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(title);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    const handleBlur = () => {
        if (value !== title) {
            onRename(value);
        }
        setIsEditing(false);
        onEditEnd();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setValue(title);
            setIsEditing(false);
            onEditEnd();
        }
    };

    if (isEditing) {
        return (
            <>
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
                    className="relative z-50 w-full bg-white border border-indigo-300 rounded px-1.5 py-0.5 text-sm text-slate-900 outline-none shadow-sm"
                />
            </>
        )
    }

    return (
        <div className="group/title flex items-center gap-2 min-w-0">
            <span className={`truncate text-sm ${isSelected ? 'font-medium text-slate-900' : 'text-slate-700'}`}>
                {title}
            </span>
            
            {/* Rename Button (Pencil) - Appears on row hover */}
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                }}
                onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                title="Rename tab"
            >
                <Pencil className="w-3 h-3" />
            </button>
        </div>
    )
}


// --- Main Component ---

const TabList: React.FC<TabListProps> = ({ 
  tabs, 
  selectedIndex, 
  highlightedTabId, 
  onSelect, 
  onRemoveTag,
  onRenameTag,
  onAddTag,
  onRenameTab,
  onTogglePin,
  onEditEnd,
  onReorderPinnedTabs
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [dropIndicator, setDropIndicator] = useState<{ id: number; position: 'top' | 'bottom' } | null>(null);
  
  // Calculate if there are any pinned tabs to decide whether to show headers
  const hasPinnedTabs = tabs.some(t => t.isPinned);

  useEffect(() => {
    if (listRef.current) {
      const rows = listRef.current.querySelectorAll('[data-row-index]');
      const selectedElement = rows[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const handleDragStart = (e: React.DragEvent, tab: Tab) => {
      if (!tab.isPinned) return;
      e.dataTransfer.setData('text/plain', tab.id.toString());
      e.dataTransfer.effectAllowed = 'move';
      // Set a transparent drag image or style (optional)
      (e.target as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
      (e.target as HTMLElement).style.opacity = '1';
      setDropIndicator(null);
  };

  const handleDragOver = (e: React.DragEvent, tab: Tab) => {
      if (!tab.isPinned) return;
      e.preventDefault(); // Necessary to allow dropping
      e.dataTransfer.dropEffect = 'move';
      
      // Calculate position for indicator
      const row = e.currentTarget.getBoundingClientRect();
      const midPoint = row.top + row.height / 2;
      const position = e.clientY < midPoint ? 'top' : 'bottom';
      
      setDropIndicator({ id: tab.id, position });
  };
  
  const handleDragLeave = () => {
      // We don't clear here immediately to avoid flickering when hovering over children
      // The state is reliably updated by onDragOver of other rows or cleared by onDragEnd
  };

  const handleDrop = (e: React.DragEvent, targetTabId: number) => {
      e.preventDefault();
      const sourceTabId = parseInt(e.dataTransfer.getData('text/plain'), 10);
      
      if (sourceTabId && sourceTabId !== targetTabId && dropIndicator) {
          if (dropIndicator.position === 'top') {
              // Insert before the target
              onReorderPinnedTabs(sourceTabId, targetTabId);
          } else {
              // Insert after the target
              // Logic: Find the NEXT pinned tab and insert before it.
              const pinnedTabs = tabs.filter(t => t.isPinned);
              const targetIndex = pinnedTabs.findIndex(t => t.id === targetTabId);
              const nextTab = pinnedTabs[targetIndex + 1];
              
              if (nextTab) {
                  onReorderPinnedTabs(sourceTabId, nextTab.id);
              } else {
                  // No next tab means we are at the end of the pinned list
                  onReorderPinnedTabs(sourceTabId, 'END');
              }
          }
      }
      setDropIndicator(null);
  };

  if (tabs.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
        <p className="text-sm">No tabs found</p>
      </div>
    );
  }

  return (
    <div 
      className="flex-1 overflow-y-auto no-scrollbar max-h-[400px] scroll-smooth scroll-pt-[42px]" 
      ref={listRef}
    >
      {tabs.map((tab, index) => {
        const isSelected = index === selectedIndex;
        const isHighlighted = tab.id === highlightedTabId;
        
        // Determine if we need a section header
        let sectionHeader = null;
        if (hasPinnedTabs) {
           if (index === 0 && tab.isPinned) {
               sectionHeader = "Favorites";
           } else if (!tab.isPinned && (index === 0 || tabs[index-1].isPinned)) {
               sectionHeader = "Tabs";
           }
        }
        
        return (
          <React.Fragment key={tab.id}>
            {sectionHeader && (
                <div className={`
                    px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-30 backdrop-blur-md flex items-center gap-2 shadow-sm transition-colors
                    ${sectionHeader === 'Favorites' 
                        ? 'bg-amber-50/80 text-amber-600 border-b border-amber-100' 
                        : 'bg-slate-50/80 text-slate-500 border-b border-slate-200/80 border-t border-t-slate-100'
                    }
                `}>
                    {sectionHeader === 'Favorites' ? (
                        <Star className="w-3 h-3 fill-amber-200 stroke-amber-600" />
                    ) : (
                        <LayoutGrid className="w-3 h-3 opacity-70" />
                    )}
                    {sectionHeader}
                </div>
            )}
            
            <div
              data-row-index={index}
              onClick={() => onSelect(tab)}
              title={`${tab.title} - ${tab.url}`}
              draggable={tab.isPinned}
              onDragStart={(e) => handleDragStart(e, tab)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, tab)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => tab.isPinned && handleDrop(e, tab.id)}
              className={`
                group relative flex items-center gap-3 px-4 py-2 cursor-pointer border-l-2 transition-all duration-200 scroll-mt-[42px]
                ${isHighlighted 
                   ? 'bg-green-50 border-green-500' 
                   : isSelected 
                      ? tab.isPinned 
                          ? 'bg-amber-100/80 border-amber-500' // Pinned & Selected
                          : 'bg-indigo-50/50 border-indigo-500' // Normal & Selected
                      : tab.isPinned
                          ? 'bg-amber-50/40 border-transparent hover:bg-amber-100/50' // Pinned & Idle
                          : 'border-transparent hover:bg-slate-50' // Normal & Idle
                }
              `}
            >
              {/* Drop Indicator Line */}
              {dropIndicator?.id === tab.id && (
                  <div className={`
                      absolute left-0 right-0 h-0.5 bg-indigo-500 z-50 pointer-events-none
                      ${dropIndicator.position === 'top' ? 'top-0' : 'bottom-0'}
                  `} />
              )}

              {/* Favicon Area with Pin Action Overlay */}
              <div className="shrink-0 relative w-4 h-4 flex items-center justify-center">
                {/* Favicon (Visible by default, hidden on hover if we show action) */}
                <div className="absolute inset-0 flex items-center justify-center rounded bg-white shadow-sm overflow-hidden group-hover:opacity-0 transition-opacity duration-200 pointer-events-none">
                    {tab.favIconUrl ? (
                        <img src={tab.favIconUrl} alt="" className="w-full h-full object-cover" onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        }} />
                    ) : (
                        <Globe className="w-2.5 h-2.5 text-slate-400" />
                    )}
                </div>
                
                {/* Pin Action Button (Hidden by default, visible on hover) */}
                <div 
                    onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(tab.id);
                    }}
                    onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
                    className="absolute -inset-3 z-10 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    title={tab.isPinned ? "Unpin tab" : "Pin tab"}
                >
                    {/* Visual Target inside large click area */}
                    <div className={`
                        w-5 h-5 flex items-center justify-center rounded bg-white shadow-sm border transition-colors
                        ${tab.isPinned 
                            ? 'text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100' 
                            : 'text-slate-400 border-slate-200 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200'
                        }
                    `}>
                        {tab.isPinned ? (
                            <ArrowDown className="w-3 h-3" />
                        ) : (
                            <ArrowUp className="w-3 h-3" />
                        )}
                    </div>
                </div>
              </div>

              {/* Content Container - Flex Wrapper */}
              <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                
                {/* 1. Title Section */}
                <div className="min-w-[120px] flex-1 overflow-hidden">
                    <TitleItem 
                        title={tab.title} 
                        isSelected={isSelected} 
                        onRename={(newTitle) => onRenameTab(tab.id, newTitle)} 
                        onEditEnd={onEditEnd}
                    />
                </div>
                
                {/* 2. Metadata/Tags Section */}
                <div className="flex items-center justify-end gap-1 shrink-0 max-w-[50%]">
                  
                  {/* Current Badge */}
                  {tab.isActive && (
                      <span className={`
                          shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border
                          ${tab.isPinned 
                             ? 'text-amber-600 bg-amber-100 border-amber-200' 
                             : 'text-indigo-600 bg-indigo-50 border-indigo-100'
                          }
                      `}>
                      Current
                      </span>
                  )}
                  
                  {/* Tags List */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mask-linear-gradient">
                    {tab.tags.map(tag => (
                        <TagItem 
                            key={tag}
                            tabId={tab.id}
                            tag={tag}
                            isSelectedRow={isSelected}
                            onRemove={() => onRemoveTag(tab.id, tag)}
                            onRename={(newTag) => onRenameTag(tab.id, tag, newTag)}
                            onEditEnd={onEditEnd}
                        />
                    ))}
                  </div>

                  {/* Add Tag Button */}
                  <AddTagButton 
                      onAdd={(tag) => onAddTag(tab.id, tag)} 
                      onEditEnd={onEditEnd}
                  />
                  
                  {/* Drag Grip (Pinned Only) */}
                  {tab.isPinned && (
                      <div 
                          className="ml-2 text-amber-300 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
                          title="Drag to reorder"
                      >
                          <GripVertical className="w-3.5 h-3.5" />
                      </div>
                  )}
                </div>
              </div>
              
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default TabList;