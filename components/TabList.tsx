import React, { useEffect, useRef, useState } from 'react';
import { Tab, ViewMode, BookmarkGroup } from '../types';
import { getDomain } from '../constants';
import { Globe, Tag as TagIcon, X, Plus, ArrowUp, ArrowDown, Pin, LayoutGrid, Pencil, GripVertical, ChevronDown, ChevronRight, Star, FolderPlus } from 'lucide-react';

interface TabListProps {
  viewMode: ViewMode;
  pinnedTabs: Tab[];
  unpinnedTabs: Tab[];
  allTabs: Tab[]; 
  bookmarkGroups?: BookmarkGroup[];
  isPinnedExpanded: boolean;
  onTogglePinnedExpanded: () => void;
  selectedIndex: number;
  highlightedTabId: number | null;
  onSelect: (tab: Tab) => void;
  onRemoveTag: (tabId: number, tag: string) => void;
  onRenameTag: (tabId: number, oldTag: string, newTag: string) => void;
  onAddTag: (tabId: number, tag: string) => void;
  onRenameTab: (tabId: number, newTitle: string) => void;
  onTogglePin: (tabId: number) => void;
  onToggleBookmark?: (tabId: number) => void;
  onMoveBookmark?: (tabId: number, groupId: string) => void;
  onCreateBookmarkGroup?: (title: string) => void;
  onEditEnd: () => void;
  onReorderPinnedTabs: (fromId: number, toId: number | 'END') => void;
  onOpenDetails: (tabId: number) => void;
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
                e.preventDefault(); // Prevent focus loss on input
            }}
            onClick={(e) => {
                e.stopPropagation(); // Stop click from reaching row
                handleBlur(); // Save and close
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
                e.preventDefault(); // Prevent focus loss
            }}
            onClick={(e) => {
                e.stopPropagation(); // Stop click from reaching row
                handleBlur(); // Save and close
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
    isBookmarked?: boolean;
    onRename: (newTitle: string) => void;
    onEditEnd: () => void;
    onToggleBookmark?: () => void;
    onDoubleClick?: () => void;
}

const TitleItem: React.FC<TitleItemProps> = ({ title, isSelected, isBookmarked, onRename, onEditEnd, onToggleBookmark, onDoubleClick }) => {
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
                        e.preventDefault(); // Prevent focus loss on input
                    }}
                    onClick={(e) => {
                        e.stopPropagation(); // Stop click from reaching row
                        handleBlur(); // Save and close
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
        <div 
            className="group/title flex items-center gap-2 min-w-0"
            onDoubleClick={(e) => {
                e.stopPropagation();
                if (onDoubleClick) onDoubleClick();
            }}
        >
            <span className={`truncate text-sm ${isSelected ? 'font-medium text-slate-900' : 'text-slate-700'}`}>
                {title}
            </span>
            
            {/* Rename Button (Pencil) */}
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

            {/* Bookmark Button */}
            {onToggleBookmark && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookmark();
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    className={`
                        p-1 rounded transition-all
                        ${isBookmarked 
                            ? 'text-amber-400 hover:bg-amber-50 opacity-100' 
                            : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50 opacity-0 group-hover:opacity-100'
                        }
                    `}
                    title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                >
                    <Star className="w-3 h-3" fill={isBookmarked ? "currentColor" : "none"} />
                </button>
            )}
        </div>
    )
}


// --- Main Component ---

const TabList: React.FC<TabListProps> = ({ 
  viewMode,
  pinnedTabs,
  unpinnedTabs,
  allTabs,
  bookmarkGroups,
  isPinnedExpanded,
  onTogglePinnedExpanded,
  selectedIndex, 
  highlightedTabId, 
  onSelect, 
  onRemoveTag,
  onRenameTag,
  onAddTag,
  onRenameTab,
  onTogglePin,
  onToggleBookmark,
  onMoveBookmark,
  onCreateBookmarkGroup,
  onEditEnd,
  onReorderPinnedTabs,
  onOpenDetails
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [dropIndicator, setDropIndicator] = useState<{ id: number; position: 'top' | 'bottom' } | null>(null);
  
  // Click debouncing for separating single click selection from double click details
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // New State for dragging bookmarks between groups
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (listRef.current) {
      const rows = listRef.current.querySelectorAll('[data-row-index]');
      const selectedElement = Array.from(rows).find((r) => (r as HTMLElement).getAttribute('data-row-index') === selectedIndex.toString()) as HTMLElement | undefined;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, isPinnedExpanded, viewMode]);

  useEffect(() => {
    return () => {
        if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  const handleRowClick = (e: React.MouseEvent, tab: Tab) => {
      // We need to debounce the click ONLY if the user clicked on the Title (which supports double click).
      // If the user clicks on empty space or elsewhere, we should select immediately for snappy feel.
      
      const target = e.target as HTMLElement;
      const isTitle = target.closest('.group\\/title');
      
      // Ignore clicks on buttons/inputs that should have stopped propagation anyway
      if (target.closest('button') || target.closest('input')) return;

      if (isTitle) {
          if (clickTimeoutRef.current) {
              // Second click detected within timeout -> Cancel single click action
              clearTimeout(clickTimeoutRef.current);
              clickTimeoutRef.current = null;
              return;
          }

          clickTimeoutRef.current = setTimeout(() => {
              onSelect(tab);
              clickTimeoutRef.current = null;
          }, 200); // 200ms delay to wait for potential double click
      } else {
          // Instant selection for non-title clicks
          if (clickTimeoutRef.current) {
              clearTimeout(clickTimeoutRef.current);
              clickTimeoutRef.current = null;
          }
          onSelect(tab);
      }
  };

  const handleDragStart = (e: React.DragEvent, tab: Tab) => {
      if (viewMode === ViewMode.BOOKMARKS) {
          // Drag logic for Bookmarks
          e.dataTransfer.setData('text/plain', tab.id.toString());
          e.dataTransfer.effectAllowed = 'move';
          (e.target as HTMLElement).style.opacity = '0.5';
      } else {
          // Drag logic for Pinned Tabs (List Mode)
          if (!tab.isPinned || viewMode === ViewMode.GROUPS) return;
          e.dataTransfer.setData('text/plain', tab.id.toString());
          e.dataTransfer.effectAllowed = 'move';
          (e.target as HTMLElement).style.opacity = '0.5';
      }
  };

  const handleDragEnd = (e: React.DragEvent) => {
      (e.target as HTMLElement).style.opacity = '1';
      setDropIndicator(null);
      setDragOverGroupId(null);
  };

  // --- DnD for Pinned Tabs ---
  const handleDragOverPinned = (e: React.DragEvent, tab: Tab) => {
      if (!tab.isPinned || viewMode === ViewMode.GROUPS || viewMode === ViewMode.BOOKMARKS) return;
      e.preventDefault(); 
      e.dataTransfer.dropEffect = 'move';
      
      const row = e.currentTarget.getBoundingClientRect();
      const midPoint = row.top + row.height / 2;
      const position = e.clientY < midPoint ? 'top' : 'bottom';
      
      setDropIndicator({ id: tab.id, position });
  };
  
  const handleDropPinned = (e: React.DragEvent, targetTabId: number) => {
      e.preventDefault();
      e.stopPropagation(); // Fix: Stop propagation to prevent parent handlers
      const sourceTabId = parseInt(e.dataTransfer.getData('text/plain'), 10);
      
      if (!isNaN(sourceTabId) && sourceTabId !== targetTabId && dropIndicator) {
          if (dropIndicator.position === 'top') {
              onReorderPinnedTabs(sourceTabId, targetTabId);
          } else {
              const pinnedTabsList = pinnedTabs; 
              const targetIndex = pinnedTabsList.findIndex(t => t.id === targetTabId);
              const nextTab = pinnedTabsList[targetIndex + 1];
              
              if (nextTab) {
                  onReorderPinnedTabs(sourceTabId, nextTab.id);
              } else {
                  onReorderPinnedTabs(sourceTabId, 'END');
              }
          }
      }
      setDropIndicator(null);
  };

  // --- DnD for Bookmarks ---
  const handleDragOverGroup = (e: React.DragEvent, groupId: string) => {
      if (viewMode !== ViewMode.BOOKMARKS) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragOverGroupId !== groupId) {
          setDragOverGroupId(groupId);
      }
  };

  const handleDropOnGroup = (e: React.DragEvent, groupId: string) => {
      if (viewMode !== ViewMode.BOOKMARKS) return;
      e.preventDefault();
      const sourceTabId = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (!isNaN(sourceTabId) && onMoveBookmark) {
          onMoveBookmark(sourceTabId, groupId);
      }
      setDragOverGroupId(null);
  };


  const renderRow = (tab: Tab, index: number) => {
      const isSelected = index === selectedIndex;
      const isHighlighted = tab.id === highlightedTabId;
      
      const isPinnedStyle = viewMode === ViewMode.LIST && tab.isPinned;

      return (
            <div
              key={tab.id}
              data-row-index={index}
              onClick={(e) => handleRowClick(e, tab)}
              title={`${tab.title} - ${tab.url}`}
              draggable={isPinnedStyle}
              onDragStart={(e) => handleDragStart(e, tab)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOverPinned(e, tab)}
              onDrop={(e) => isPinnedStyle && handleDropPinned(e, tab.id)}
              className={`
                group relative flex items-center gap-3 px-4 py-2 cursor-pointer border-l-2 transition-all duration-200 scroll-mt-[80px]
                ${isHighlighted 
                   ? 'bg-green-50 border-green-500' 
                   : isSelected 
                      ? isPinnedStyle 
                          ? 'bg-amber-100/80 border-amber-500' 
                          : 'bg-indigo-50/50 border-indigo-500' 
                      : isPinnedStyle
                          ? 'bg-amber-50/40 border-transparent hover:bg-amber-100/50' 
                          : 'border-transparent hover:bg-slate-50'
                }
              `}
            >
              {/* Drop Indicator for Pinned */}
              {dropIndicator?.id === tab.id && (
                  <div className={`
                      absolute left-0 right-0 h-0.5 bg-indigo-500 z-50 pointer-events-none
                      ${dropIndicator.position === 'top' ? 'top-0' : 'bottom-0'}
                  `} />
              )}

              {/* Favicon Area */}
              <div className="shrink-0 relative w-4 h-4 flex items-center justify-center group/pin">
                <div className="absolute inset-0 flex items-center justify-center rounded bg-white shadow-sm overflow-hidden group-hover/pin:opacity-0 transition-opacity duration-200 pointer-events-none">
                    {tab.favIconUrl ? (
                        <img src={tab.favIconUrl} alt="" className="w-full h-full object-cover" onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        }} />
                    ) : (
                        <Globe className="w-2.5 h-2.5 text-slate-400" />
                    )}
                </div>
                
                <div 
                    onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(tab.id);
                    }}
                    onMouseDown={(e) => e.preventDefault()} 
                    className="absolute -inset-3 z-10 flex items-center justify-center cursor-pointer opacity-0 group-hover/pin:opacity-100 transition-opacity duration-200"
                    title={tab.isPinned ? "Unpin tab" : "Pin tab"}
                >
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

              {/* Content */}
              <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                <div className="min-w-[120px] flex-1 overflow-hidden">
                    <TitleItem 
                        title={tab.title} 
                        isSelected={isSelected} 
                        isBookmarked={tab.isBookmarked}
                        onRename={(newTitle) => onRenameTab(tab.id, newTitle)} 
                        onToggleBookmark={() => onToggleBookmark?.(tab.id)}
                        onEditEnd={onEditEnd}
                        onDoubleClick={() => onOpenDetails(tab.id)}
                    />
                </div>
                <div className="flex items-center justify-end gap-1 shrink-0 max-w-[50%]">
                  {tab.isActive && (
                      <span className={`
                          shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border
                          ${isPinnedStyle 
                             ? 'text-amber-600 bg-amber-100 border-amber-200' 
                             : 'text-indigo-600 bg-indigo-50 border-indigo-100'
                          }
                      `}>
                      Current
                      </span>
                  )}
                  {viewMode === ViewMode.GROUPS && tab.isPinned && (
                      <Pin className="w-3 h-3 text-amber-500 ml-1" />
                  )}
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
                  <AddTagButton 
                      onAdd={(tag) => onAddTag(tab.id, tag)} 
                      onEditEnd={onEditEnd}
                  />
                  {isPinnedStyle && (
                      <div 
                          className="ml-2 text-amber-300 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
                          title="Drag to reorder"
                      >
                          <GripVertical className="w-3 h-3" />
                      </div>
                  )}
                </div>
              </div>
            </div>
      );
  };

  // New Component for Bookmark Card
  const renderBookmarkCard = (tab: Tab, index: number) => {
      const isSelected = index === selectedIndex;
      
      return (
          <div 
            key={tab.id}
            data-row-index={index}
            onClick={(e) => handleRowClick(e, tab)}
            draggable
            onDragStart={(e) => handleDragStart(e, tab)}
            onDragEnd={handleDragEnd}
            className={`
                group relative flex flex-col gap-2 p-2 rounded-lg border transition-all cursor-pointer
                ${isSelected 
                    ? 'bg-indigo-50 border-indigo-500 shadow-sm' 
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }
            `}
          >
             <div className="flex items-center gap-2">
                 {/* Favicon */}
                 <div className="shrink-0 w-4 h-4 flex items-center justify-center rounded bg-slate-50 border border-slate-100 overflow-hidden">
                     {tab.favIconUrl ? (
                        <img src={tab.favIconUrl} alt="" className="w-full h-full object-cover" onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }} />
                    ) : (
                        <Globe className="w-3 h-3 text-slate-400" />
                    )}
                 </div>
                 
                 {/* Title */}
                 <div className="flex-1 min-w-0 overflow-hidden">
                     <TitleItem 
                         title={tab.title}
                         isSelected={isSelected}
                         onRename={(newTitle) => onRenameTab(tab.id, newTitle)}
                         onEditEnd={onEditEnd}
                         onDoubleClick={() => onOpenDetails(tab.id)}
                     />
                 </div>

                 {/* Action: Unbookmark */}
                 <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookmark?.(tab.id);
                    }}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-amber-500 p-0.5"
                    title="Remove from bookmarks"
                 >
                     <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                 </button>
             </div>
          </div>
      );
  };

  // Helper to create new groups
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const groupInputRef = useRef<HTMLInputElement>(null);

  const submitNewGroup = () => {
      if (newGroupName.trim() && onCreateBookmarkGroup) {
          onCreateBookmarkGroup(newGroupName.trim());
      }
      setNewGroupName('');
      setIsCreatingGroup(false);
  };


  if (allTabs.length === 0 && viewMode !== ViewMode.BOOKMARKS) {
    return (
      <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
        <p className="text-sm">No tabs found</p>
      </div>
    );
  }

  return (
    <div ref={listRef} className="h-full overflow-y-auto overflow-x-hidden no-scrollbar scroll-smooth pb-4 scroll-pt-[42px]">
        
        {/* --- LIST VIEW MODE --- */}
        {viewMode === ViewMode.LIST && (
          <>
            {/* Pinned Section */}
            {pinnedTabs.length > 0 && (
                <div>
                    <div 
                        onClick={onTogglePinnedExpanded}
                        className="sticky top-0 z-30 flex items-center gap-2 px-4 py-1.5 bg-amber-50/80 backdrop-blur-md border-b border-amber-100 text-xs font-bold text-amber-600/80 shadow-sm cursor-pointer select-none hover:text-amber-700 transition-colors"
                    >
                        <div className="p-0.5 rounded hover:bg-amber-100/50">
                           {isPinnedExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </div>
                        <Pin className="w-3 h-3" fill="currentColor" />
                        <span className="uppercase tracking-wider">Pinned</span>
                        <span className="ml-auto text-[9px] opacity-60 font-normal">{pinnedTabs.length} items</span>
                    </div>
                    
                    {isPinnedExpanded && pinnedTabs.map((tab, i) => renderRow(tab, i))}
                </div>
            )}

            {/* Normal Section */}
            {unpinnedTabs.length > 0 && (
                <div>
                    {pinnedTabs.length > 0 && (
                        <div className="sticky top-0 z-30 flex items-center gap-2 px-4 py-1.5 bg-white/80 backdrop-blur-md border-y border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider shadow-sm mt-[-1px]">
                            <LayoutGrid className="w-3 h-3 opacity-50" />
                            <span>Tabs</span>
                        </div>
                    )}
                    {unpinnedTabs.map((tab, i) => renderRow(tab, pinnedTabs.length + i))}
                </div>
            )}
          </>
        )}

        {/* --- GROUPS VIEW MODE --- */}
        {viewMode === ViewMode.GROUPS && (
          <>
            {allTabs.map((tab, index) => {
               const prevTab = allTabs[index - 1];
               const currentDomain = getDomain(tab.url);
               const prevDomain = prevTab ? getDomain(prevTab.url) : null;
               const showHeader = currentDomain !== prevDomain;

               return (
                 <React.Fragment key={tab.id}>
                    {showHeader && (
                      <div className="sticky top-0 z-30 flex items-center gap-2 px-4 py-1.5 bg-slate-100/95 backdrop-blur-md border-y border-slate-200 text-xs font-semibold text-slate-700 shadow-sm mt-[-1px]">
                        <LayoutGrid className="w-3 h-3 opacity-50" />
                        <span className="uppercase tracking-wider">{currentDomain}</span>
                        <span className="ml-auto text-[10px] font-normal opacity-50">
                            {allTabs.filter(t => getDomain(t.url) === currentDomain).length} tabs
                        </span>
                      </div>
                    )}
                    {renderRow(tab, index)}
                 </React.Fragment>
               );
            })}
          </>
        )}

        {/* --- BOOKMARKS VIEW MODE --- */}
        {viewMode === ViewMode.BOOKMARKS && bookmarkGroups && (
            <div className="p-4 flex flex-col gap-6">
                {bookmarkGroups.map((group) => {
                    const groupTabs = allTabs.filter(t => t.bookmarkGroupId === group.id);
                    const isOver = dragOverGroupId === group.id;

                    return (
                        <div 
                            key={group.id} 
                            className={`flex flex-col gap-2 rounded-lg transition-colors ${isOver ? 'bg-indigo-50 ring-2 ring-indigo-200' : ''}`}
                            onDragOver={(e) => handleDragOverGroup(e, group.id)}
                            onDrop={(e) => handleDropOnGroup(e, group.id)}
                        >
                             <div className="flex items-center gap-2 px-2 py-1 border-b border-slate-200/50 text-xs font-bold text-slate-600 uppercase tracking-wider">
                                 <Star className="w-3 h-3 text-amber-400" fill="currentColor" />
                                 <span>{group.title}</span>
                                 <span className="ml-auto text-[9px] font-normal opacity-50">{groupTabs.length} items</span>
                             </div>

                             <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                                 {groupTabs.map(tab => {
                                     // Find index in the global visible list for selection syncing
                                     const globalIndex = allTabs.findIndex(t => t.id === tab.id);
                                     return renderBookmarkCard(tab, globalIndex);
                                 })}
                                 {groupTabs.length === 0 && (
                                     <div className="col-span-full py-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                                         Drag items here
                                     </div>
                                 )}
                             </div>
                        </div>
                    )
                })}

                {/* Create Group Action */}
                <div className="mt-2 px-2">
                    {isCreatingGroup ? (
                        <div className="flex items-center gap-2 animate-in fade-in duration-200">
                            <input
                                ref={groupInputRef}
                                type="text" 
                                className="text-sm border border-indigo-300 rounded px-2 py-1 outline-none text-slate-700 w-48 shadow-sm"
                                placeholder="Group Name..."
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') submitNewGroup();
                                    if (e.key === 'Escape') setIsCreatingGroup(false);
                                }}
                                autoFocus
                                onBlur={() => setTimeout(() => {
                                    setIsCreatingGroup(false);
                                }, 200)}
                            />
                            <button 
                                onClick={submitNewGroup}
                                className="text-xs bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600 transition-colors"
                            >
                                Create
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsCreatingGroup(true)}
                            className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-indigo-500 transition-colors p-1 rounded hover:bg-slate-100"
                        >
                            <FolderPlus className="w-4 h-4" />
                            <span>New Group</span>
                        </button>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

export default TabList;