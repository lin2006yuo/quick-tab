import React, { useState, useEffect, useRef, useMemo } from 'react';
import { INITIAL_TABS, AVAILABLE_COMMANDS, INITIAL_BOOKMARK_GROUPS, getDomain } from './constants';
import { Tab, InputMode, CommandDefinition, CommandType, ViewMode, BookmarkGroup } from './types';
import TabList from './components/TabList';
import TabDetails from './components/TabDetails';
import CommandMenu from './components/CommandMenu';
import Toolbar from './components/Toolbar';
import { AppIcon, CmdKeyIcon } from './components/CommandIcon';

const App: React.FC = () => {
  // --- State ---
  const [isOpen, setIsOpen] = useState(true);
  const [tabs, setTabs] = useState<Tab[]>(INITIAL_TABS);
  const [bookmarkGroups, setBookmarkGroups] = useState<BookmarkGroup[]>(INITIAL_BOOKMARK_GROUPS);
  const [query, setQuery] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>(InputMode.SEARCH);
  const [activeCommand, setActiveCommand] = useState<CommandDefinition | null>(null);
  
  // Window State
  const [windowPos, setWindowPos] = useState({ x: 100, y: 100 });
  const [windowSize, setWindowSize] = useState({ width: 650, height: 600 });
  
  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.LIST);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true);
  const [highlightedTabId, setHighlightedTabId] = useState<number | null>(null);
  const [targetTabIdToSelect, setTargetTabIdToSelect] = useState<number | null>(null);
  
  // Details View State
  const [detailTabId, setDetailTabId] = useState<number | null>(null);
  
  // Navigation indices
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevFilteredTabsRef = useRef<Tab[]>([]);
  const dragRef = useRef<{ startX: number, startY: number, startLeft: number, startTop: number } | null>(null);
  const resizeRef = useRef<{ startX: number, startY: number, startW: number, startH: number, direction: string } | null>(null);
  const animationFrameRef = useRef<number>(0);


  // --- Derived State ---

  // 1. Filter tabs based on query and mode (Raw Filtered List)
  const filteredTabs = useMemo(() => {
    if (inputMode === InputMode.COMMAND_ACTIVE && activeCommand?.id === CommandType.MARK) {
      return tabs.filter(t => t.isActive);
    }

    let result = tabs;

    if (inputMode === InputMode.COMMAND_SELECT) {
       result = tabs; 
    }
    else if (query) {
      const lowerQ = query.toLowerCase();
      result = tabs.filter(t => 
        t.title.toLowerCase().includes(lowerQ) || 
        t.url.toLowerCase().includes(lowerQ) ||
        t.tags.some(tag => tag.toLowerCase().includes(lowerQ))
      );
    }

    if (viewMode === ViewMode.GROUPS) {
      // In Group mode, sort by Domain -> Pinned -> Title
      return [...result].sort((a, b) => {
        const domainA = getDomain(a.url);
        const domainB = getDomain(b.url);
        const domainCompare = domainA.localeCompare(domainB);
        if (domainCompare !== 0) return domainCompare;
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return a.title.localeCompare(b.title);
      });
    }

    if (viewMode === ViewMode.BOOKMARKS) {
        // Only show bookmarked items
        const bookmarked = result.filter(t => t.isBookmarked);
        // Sort by Group ID to ensure visual consistency with the group rendering
        // Then by title
        return bookmarked.sort((a, b) => {
            const groupA = a.bookmarkGroupId || '';
            const groupB = b.bookmarkGroupId || '';
            const groupCompare = groupA.localeCompare(groupB);
            if (groupCompare !== 0) return groupCompare;
            return a.title.localeCompare(b.title);
        });
    }

    // In List mode, Pinned items first
    return [...result].sort((a, b) => {
      if (a.isPinned && b.isPinned) {
        return (a.pinnedAt || 0) - (b.pinnedAt || 0);
      }
      return 0;
    });
  }, [tabs, query, inputMode, activeCommand, viewMode]);

  // 2. Split into Pinned and Unpinned (Only for LIST mode)
  const pinnedTabs = useMemo(() => filteredTabs.filter(t => t.isPinned), [filteredTabs]);
  const unpinnedTabs = useMemo(() => filteredTabs.filter(t => !t.isPinned), [filteredTabs]);

  // 3. Construct the "Visible" list for Keyboard Navigation and Selection Indexing
  const visibleTabs = useMemo(() => {
      if (viewMode === ViewMode.GROUPS || viewMode === ViewMode.BOOKMARKS) {
        // In groups/bookmarks mode, everything in the filtered list is visible
        return filteredTabs;
      }

      // In LIST mode, respect the pinned expansion
      if (isPinnedExpanded) {
          return [...pinnedTabs, ...unpinnedTabs];
      }
      return unpinnedTabs;
  }, [isPinnedExpanded, pinnedTabs, unpinnedTabs, viewMode, filteredTabs]);

  // 4. Get Active Details Tab
  const detailTab = useMemo(() => {
      return tabs.find(t => t.id === detailTabId);
  }, [tabs, detailTabId]);


  const filteredCommands = useMemo(() => {
    if (inputMode !== InputMode.COMMAND_SELECT) return [];
    const cmdQuery = query.slice(1).toLowerCase();
    return AVAILABLE_COMMANDS.filter(cmd => 
      cmd.trigger.includes(cmdQuery)
    );
  }, [query, inputMode]);

  const selectedCommand = filteredCommands[selectedCommandIndex];

  const ghostSuffix = useMemo(() => {
    if (inputMode !== InputMode.COMMAND_SELECT || !selectedCommand) return '';
    const fullTrigger = `/${selectedCommand.trigger}`;
    if (fullTrigger.toLowerCase().startsWith(query.toLowerCase())) {
        return fullTrigger.slice(query.length);
    }
    return '';
  }, [query, inputMode, selectedCommand]);

  // --- Effects ---
  
  // Initialize Position
  useEffect(() => {
      setWindowPos({
          x: Math.max(0, window.innerWidth / 2 - 325),
          y: 100
      });
      
      return () => {
          if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
          }
      };
  }, []);

  // Auto-expand Pinned section when searching
  useEffect(() => {
      if (query.length > 0) {
          setIsPinnedExpanded(true);
      }
  }, [query]);

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        if (!isOpen) {
          setQuery('');
          setInputMode(InputMode.SEARCH);
          setActiveCommand(null);
          setDetailTabId(null);
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      }

      // Switch View Mode shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault();
        setViewMode(ViewMode.LIST);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '2') {
        e.preventDefault();
        setViewMode(ViewMode.GROUPS);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '3') {
        e.preventDefault();
        setViewMode(ViewMode.BOOKMARKS);
      }

      if (e.key === 'Escape') {
        if (detailTabId !== null) {
            setDetailTabId(null);
            return;
        }
        if (inputMode === InputMode.COMMAND_ACTIVE) {
          setInputMode(InputMode.SEARCH);
          setActiveCommand(null);
          setQuery('');
        } else if (query.length > 0) {
          setQuery('');
          setInputMode(InputMode.SEARCH);
        } else {
          setIsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [isOpen, inputMode, query, detailTabId]);

  // Selection Index Logic
  useEffect(() => {
    const listChanged = prevFilteredTabsRef.current !== visibleTabs;
    prevFilteredTabsRef.current = visibleTabs;

    if (targetTabIdToSelect !== null) {
      const newIndex = visibleTabs.findIndex(t => t.id === targetTabIdToSelect);
      if (newIndex !== -1) {
        setSelectedTabIndex(newIndex);
      }
      setTargetTabIdToSelect(null);
    } else if (listChanged) {
      setSelectedTabIndex(0);
    }
  }, [visibleTabs, targetTabIdToSelect]);

  useEffect(() => { setSelectedCommandIndex(0); }, [filteredCommands]);


  // --- Handlers ---
  
  // Drag Handlers
  const handleMouseDownDrag = (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button, input, textarea')) return;
      
      dragRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startLeft: windowPos.x,
          startTop: windowPos.y
      };
      document.addEventListener('mousemove', handleMouseMoveDrag);
      document.addEventListener('mouseup', handleMouseUpDrag);
  };
  
  const handleMouseMoveDrag = (e: MouseEvent) => {
      if (!dragRef.current || !containerRef.current) return;
      
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = requestAnimationFrame(() => {
          if (containerRef.current) {
              containerRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
          }
      });
  };

  const handleMouseUpDrag = (e: MouseEvent) => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      
      if (dragRef.current && containerRef.current) {
          const dx = e.clientX - dragRef.current.startX;
          const dy = e.clientY - dragRef.current.startY;
          
          const newX = dragRef.current.startLeft + dx;
          const newY = dragRef.current.startTop + dy;

          setWindowPos({ x: newX, y: newY });
          containerRef.current.style.transform = 'none';
          containerRef.current.style.left = `${newX}px`;
          containerRef.current.style.top = `${newY}px`;
      }
      dragRef.current = null;
      document.removeEventListener('mousemove', handleMouseMoveDrag);
      document.removeEventListener('mouseup', handleMouseUpDrag);
  };
  
  // Resize Handlers
  const handleMouseDownResize = (e: React.MouseEvent, direction: string) => {
      e.preventDefault();
      e.stopPropagation();
      resizeRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startW: windowSize.width,
          startH: windowSize.height,
          direction
      };
      document.addEventListener('mousemove', handleMouseMoveResize);
      document.addEventListener('mouseup', handleMouseUpResize);
  };

  const handleMouseMoveResize = (e: MouseEvent) => {
      if (!resizeRef.current || !containerRef.current) return;
      
      const dx = e.clientX - resizeRef.current.startX;
      const dy = e.clientY - resizeRef.current.startY;
      
      let newW = resizeRef.current.startW;
      let newH = resizeRef.current.startH;

      if (resizeRef.current.direction.includes('right')) newW += dx;
      if (resizeRef.current.direction.includes('bottom')) newH += dy;

      newW = Math.max(400, newW);
      newH = Math.max(300, newH);

      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = requestAnimationFrame(() => {
          if (containerRef.current) {
              containerRef.current.style.width = `${newW}px`;
              containerRef.current.style.height = `${newH}px`;
          }
      });
  };

  const handleMouseUpResize = (e: MouseEvent) => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

      if (resizeRef.current && containerRef.current) {
          const dx = e.clientX - resizeRef.current.startX;
          const dy = e.clientY - resizeRef.current.startY;
          
          let newW = resizeRef.current.startW;
          let newH = resizeRef.current.startH;

          if (resizeRef.current.direction.includes('right')) newW += dx;
          if (resizeRef.current.direction.includes('bottom')) newH += dy;

          newW = Math.max(400, newW);
          newH = Math.max(300, newH);

          setWindowSize({ width: newW, height: newH });
          
          containerRef.current.style.width = `${newW}px`;
          containerRef.current.style.height = `${newH}px`;
      }
      resizeRef.current = null;
      document.removeEventListener('mousemove', handleMouseMoveResize);
      document.removeEventListener('mouseup', handleMouseUpResize);
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (inputMode === InputMode.SEARCH && val === '/') {
      setInputMode(InputMode.COMMAND_SELECT);
      setQuery(val);
      return;
    }
    if (inputMode === InputMode.COMMAND_SELECT && val === '') {
      setInputMode(InputMode.SEARCH);
      setQuery('');
      return;
    }
    setQuery(val);
  };

  const executeMarkCommand = (tagName: string) => {
    if (!tagName.trim()) return;
    const activeTab = tabs.find(t => t.isActive);
    const targetTabId = activeTab?.id;

    if (targetTabId) {
        setTargetTabIdToSelect(targetTabId);
        setTabs(prev => prev.map(tab => {
            if (tab.id === targetTabId) {
                if (tab.tags.includes(tagName.trim())) return tab;
                return { ...tab, tags: [...tab.tags, tagName.trim()] };
            }
            return tab;
        }));
        setHighlightedTabId(targetTabId);
        setTimeout(() => setHighlightedTabId(null), 2000);
    }
    setQuery('');
    setInputMode(InputMode.SEARCH);
    setActiveCommand(null);
  };

  const handleAddTag = (tabId: number, tagName: string) => {
    const trimmedTag = tagName.trim();
    if (!trimmedTag) return;
    setTargetTabIdToSelect(tabId);
    setTabs(prev => prev.map(tab => {
      if (tab.id === tabId) {
        if (tab.tags.includes(trimmedTag)) return tab;
        return { ...tab, tags: [...tab.tags, trimmedTag] };
      }
      return tab;
    }));
  };

  const handleRemoveTag = (tabId: number, tagToRemove: string) => {
    setTargetTabIdToSelect(tabId);
    setTabs(prev => prev.map(tab => {
      if (tab.id === tabId) {
        return { ...tab, tags: tab.tags.filter(t => t !== tagToRemove) };
      }
      return tab;
    }));
  };

  const handleRenameTag = (tabId: number, oldTag: string, newTag: string) => {
    const trimmedNewTag = newTag.trim();
    if (trimmedNewTag === oldTag) return;
    setTargetTabIdToSelect(tabId);
    setTabs(prev => prev.map(tab => {
      if (tab.id !== tabId) return tab;
      if (!trimmedNewTag) {
        return { ...tab, tags: tab.tags.filter(t => t !== oldTag) };
      }
      if (tab.tags.includes(trimmedNewTag)) {
        return { ...tab, tags: tab.tags.filter(t => t !== oldTag) };
      }
      return {
        ...tab,
        tags: tab.tags.map(t => t === oldTag ? trimmedNewTag : t)
      };
    }));
  };

  const handleRenameTab = (tabId: number, newTitle: string) => {
    if (!newTitle.trim()) return;
    setTargetTabIdToSelect(tabId);
    setTabs(prev => prev.map(tab => {
      if (tab.id === tabId) {
        return { ...tab, title: newTitle.trim() };
      }
      return tab;
    }));
  };

  const handleUpdateNote = (tabId: number, note: string) => {
      setTabs(prev => prev.map(tab => {
          if (tab.id === tabId) {
              return { ...tab, note };
          }
          return tab;
      }));
  };

  const handleTogglePin = (tabId: number) => {
    setTargetTabIdToSelect(tabId);
    setTabs(prev => prev.map(tab => {
      if (tab.id === tabId) {
        const newIsPinned = !tab.isPinned;
        return { 
          ...tab, 
          isPinned: newIsPinned,
          pinnedAt: newIsPinned ? Date.now() : undefined 
        };
      }
      return tab;
    }));
  };
  
  const handleReorderPinnedTabs = (fromId: number, toId: number | 'END') => {
      if (viewMode === ViewMode.GROUPS || viewMode === ViewMode.BOOKMARKS) return;

      setTargetTabIdToSelect(fromId);
      setTabs(prevTabs => {
          const pinnedTabs = prevTabs
            .filter(t => t.isPinned)
            .sort((a, b) => (a.pinnedAt || 0) - (b.pinnedAt || 0));
            
          const fromIndex = pinnedTabs.findIndex(t => t.id === fromId);
          
          let toIndex = -1;
          if (toId === 'END') {
              toIndex = pinnedTabs.length;
          } else {
              toIndex = pinnedTabs.findIndex(t => t.id === toId);
          }
          
          if (fromIndex === -1 || toIndex === -1) return prevTabs;
          
          const item = pinnedTabs[fromIndex];
          const newPinnedOrder = [...pinnedTabs];
          newPinnedOrder.splice(fromIndex, 1);
          
          let insertIndex = toIndex;
          if (fromIndex < toIndex) {
              insertIndex = toIndex - 1;
          }
          
          newPinnedOrder.splice(insertIndex, 0, item);
          
          // Assign strictly increasing timestamps to maintain robust order
          const baseTime = Date.now();
          const reorderedIds = new Map(newPinnedOrder.map((t, index) => [t.id, baseTime + index]));
          
          return prevTabs.map(tab => {
              if (tab.isPinned && reorderedIds.has(tab.id)) {
                  return { ...tab, pinnedAt: reorderedIds.get(tab.id) };
              }
              return tab;
          });
      });
  };

  // --- Bookmark Handlers ---
  const handleToggleBookmark = (tabId: number) => {
      setTargetTabIdToSelect(tabId);
      setTabs(prev => prev.map(tab => {
          if (tab.id === tabId) {
              const isBookmarked = !tab.isBookmarked;
              return {
                  ...tab,
                  isBookmarked,
                  bookmarkGroupId: isBookmarked ? (tab.bookmarkGroupId || bookmarkGroups[0]?.id) : undefined
              };
          }
          return tab;
      }));
  };

  const handleMoveBookmark = (tabId: number, targetGroupId: string) => {
      setTargetTabIdToSelect(tabId);
      setTabs(prev => prev.map(tab => {
          if (tab.id === tabId) {
              return { ...tab, bookmarkGroupId: targetGroupId };
          }
          return tab;
      }));
  };

  const handleCreateBookmarkGroup = (title: string) => {
      if (!title.trim()) return;
      const newGroup: BookmarkGroup = {
          id: `group-${Date.now()}`,
          title: title.trim()
      };
      setBookmarkGroups(prev => [...prev, newGroup]);
  };


  const handleTabClick = (tab: Tab) => {
    setQuery(tab.title);
    setInputMode(InputMode.SEARCH);
    inputRef.current?.focus();
  };

  const handleEditEnd = () => {
    setTimeout(() => {
        inputRef.current?.focus();
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (inputMode === InputMode.COMMAND_ACTIVE && query.length === 0) {
        e.preventDefault();
        setInputMode(InputMode.SEARCH);
        setActiveCommand(null);
        return;
      }
    }
    
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        // Reordering only supported in LIST mode
        if (viewMode === ViewMode.GROUPS || viewMode === ViewMode.BOOKMARKS) return;

        const currentTab = visibleTabs[selectedTabIndex];
        
        if (currentTab && currentTab.isPinned) {
            const currentIndexInPinned = pinnedTabs.findIndex(t => t.id === currentTab.id);
            
            if (e.key === 'ArrowUp' && currentIndexInPinned > 0) {
                const targetTab = pinnedTabs[currentIndexInPinned - 1];
                handleReorderPinnedTabs(currentTab.id, targetTab.id);
            } else if (e.key === 'ArrowDown' && currentIndexInPinned < pinnedTabs.length - 1) {
                const targetAfterNeighbor = pinnedTabs[currentIndexInPinned + 2];
                if (targetAfterNeighbor) {
                    handleReorderPinnedTabs(currentTab.id, targetAfterNeighbor.id);
                } else {
                    handleReorderPinnedTabs(currentTab.id, 'END');
                }
            }
        }
        return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (inputMode === InputMode.COMMAND_SELECT) {
        setSelectedCommandIndex(prev => (prev + 1) % filteredCommands.length);
      } else {
        setSelectedTabIndex(prev => (prev + 1) % visibleTabs.length);
      }
    } 
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (inputMode === InputMode.COMMAND_SELECT) {
        setSelectedCommandIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else {
        setSelectedTabIndex(prev => (prev - 1 + visibleTabs.length) % visibleTabs.length);
      }
    } 
    else if (e.key === 'Enter') {
      e.preventDefault();
      
      if (inputMode === InputMode.COMMAND_SELECT) {
        const cmd = filteredCommands[selectedCommandIndex];
        if (cmd) {
          const fullTrigger = `/${cmd.trigger}`;
          if (query.toLowerCase() !== fullTrigger.toLowerCase()) {
            setQuery(fullTrigger);
          } else {
            setActiveCommand(cmd);
            setInputMode(InputMode.COMMAND_ACTIVE);
            setQuery('');
          }
        }
      } 
      else if (inputMode === InputMode.COMMAND_ACTIVE) {
        if (activeCommand?.id === CommandType.MARK) {
          executeMarkCommand(query);
        }
      } 
      else if (inputMode === InputMode.SEARCH) {
        const tab = visibleTabs[selectedTabIndex];
        if (tab) {
          alert(`Switching to tab: ${tab.title}`);
        }
      }
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center text-slate-400">
        <p>Press <span className="font-mono bg-slate-200 px-2 py-1 rounded text-slate-600">Cmd + E</span> to open Tab Commander</p>
      </div>
    );
  }

  return (
    <div 
        ref={containerRef}
        className="fixed flex flex-col bg-white rounded-xl shadow-2xl border border-slate-200/80 overflow-hidden text-slate-800 ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-150"
        style={{ 
            left: windowPos.x, 
            top: windowPos.y,
            width: windowSize.width,
            height: windowSize.height,
            transition: 'none'
        }}
    >
      {/* --- Drag Handle --- */}
      <div 
          onMouseDown={handleMouseDownDrag}
          className="h-5 w-full bg-slate-50 border-b border-slate-100 flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0 z-50"
          title="Drag to move"
      >
         <div className="w-12 h-1 bg-slate-200 rounded-full"></div>
      </div>
      
      {/* --- Header --- */}
      <div className="flex items-center px-4 py-3 border-b border-slate-100 bg-white relative z-20 gap-3 transition-all duration-200 shrink-0">
        {inputMode === InputMode.COMMAND_ACTIVE && activeCommand ? (
          <div className="flex shrink-0 items-center gap-2 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 select-none animate-in zoom-in-95 duration-150">
             <span className="text-slate-400">
               {React.cloneElement(activeCommand.icon as React.ReactElement<{ className?: string }>, { className: "w-3.5 h-3.5" })}
             </span>
             <span className="text-sm font-medium">{activeCommand.label}</span>
          </div>
        ) : (
          <div className="flex shrink-0 items-center justify-center w-6 h-6 ml-1 text-slate-400">
             <AppIcon />
          </div>
        )}

        <div className="flex-1 relative h-9 flex items-center">
          {inputMode === InputMode.COMMAND_SELECT && ghostSuffix && (
            <div className="absolute inset-0 pointer-events-none flex items-center text-lg overflow-hidden pl-[1px]" aria-hidden="true">
              <span className="invisible whitespace-pre">{query}</span>
              <span className="text-slate-300">{ghostSuffix}</span>
            </div>
          )}

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              inputMode === InputMode.COMMAND_ACTIVE && activeCommand?.id === CommandType.MARK
                ? "Type tag name..."
                : "Search tabs or type '/'..."
            }
            className="w-full h-full bg-transparent text-lg outline-none text-slate-700 placeholder:text-slate-400 font-normal"
            autoComplete="off"
            autoFocus
          />
        </div>

        <div className="flex items-center gap-2">
            {inputMode === InputMode.COMMAND_ACTIVE ? (
                <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">Esc to cancel</span>
            ) : (
                <div className="flex items-center gap-1">
                   <CmdKeyIcon />
                   <span className="text-xs font-medium text-slate-400">E</span>
                </div>
            )}
        </div>
      </div>

      {/* --- Toolbar --- */}
      <div className="shrink-0">
        <Toolbar viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {/* --- Body --- */}
      <div className="relative flex-1 flex flex-col bg-slate-50/50 min-h-0">
        {inputMode === InputMode.COMMAND_SELECT && (
          <div className="z-50">
             <CommandMenu 
              commands={filteredCommands} 
              selectedIndex={selectedCommandIndex}
              onSelect={(cmd) => {
                  setActiveCommand(cmd);
                  setInputMode(InputMode.COMMAND_ACTIVE);
                  setQuery('');
                  inputRef.current?.focus();
              }} 
            />
          </div>
        )}

        {inputMode === InputMode.COMMAND_ACTIVE && activeCommand?.id === CommandType.MARK && (
          <div className="shrink-0 px-4 py-2 bg-indigo-50/50 border-b border-indigo-50 text-xs text-indigo-600 font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            <span>Marking Active Tab</span>
          </div>
        )}
        
        <div className="relative z-0 flex-1 flex flex-col min-h-0">
           {inputMode === InputMode.COMMAND_SELECT && (
             <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-40" />
           )}
           
           {/* Tab List View */}
           <TabList 
              viewMode={viewMode}
              pinnedTabs={pinnedTabs}
              unpinnedTabs={unpinnedTabs}
              allTabs={visibleTabs} 
              bookmarkGroups={bookmarkGroups}
              isPinnedExpanded={isPinnedExpanded}
              onTogglePinnedExpanded={() => setIsPinnedExpanded(p => !p)}
              selectedIndex={selectedTabIndex} 
              highlightedTabId={highlightedTabId}
              onSelect={handleTabClick}
              onRemoveTag={handleRemoveTag}
              onRenameTag={handleRenameTag}
              onAddTag={handleAddTag}
              onRenameTab={handleRenameTab}
              onTogglePin={handleTogglePin}
              onToggleBookmark={handleToggleBookmark}
              onMoveBookmark={handleMoveBookmark}
              onCreateBookmarkGroup={handleCreateBookmarkGroup}
              onEditEnd={handleEditEnd}
              onReorderPinnedTabs={handleReorderPinnedTabs}
              onOpenDetails={(id) => setDetailTabId(id)}
            />

           {/* Details Overlay */}
           {detailTab && (
               <TabDetails 
                  tab={detailTab}
                  onClose={() => {
                      setDetailTabId(null);
                      setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                  onRenameTab={(title) => handleRenameTab(detailTab.id, title)}
                  onTogglePin={() => handleTogglePin(detailTab.id)}
                  onToggleBookmark={() => handleToggleBookmark(detailTab.id)}
                  onAddTag={(tag) => handleAddTag(detailTab.id, tag)}
                  onRemoveTag={(tag) => handleRemoveTag(detailTab.id, tag)}
                  onUpdateNote={(note) => handleUpdateNote(detailTab.id, note)}
               />
           )}
        </div>
        
        {/* Footer */}
        <div className="shrink-0 px-4 py-2 bg-white border-t border-slate-100 text-[10px] text-slate-400 flex flex-between items-center shadow-[0_-1px_2px_rgba(0,0,0,0.02)] relative z-20 justify-between select-none">
            <div className="flex gap-3">
                {inputMode === InputMode.COMMAND_ACTIVE && activeCommand?.id === CommandType.MARK ? (
                     <span className="text-indigo-500 font-medium">Press Enter to apply tag</span>
                ) : (
                    <span>{visibleTabs.length} tabs found</span>
                )}
            </div>
            <div className="flex gap-3">
                {viewMode === ViewMode.LIST && (
                   <span className="flex items-center gap-1">
                       <kbd className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-sans text-slate-500">Alt</kbd> + <kbd className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-sans text-slate-500">↑↓</kbd> sort
                   </span>
                )}
                <span className="flex items-center gap-1">
                    <kbd className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-sans text-slate-500">↑↓</kbd> navigate
                </span>
                <span className="flex items-center gap-1">
                    <kbd className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-sans text-slate-500">↵</kbd> select
                </span>
            </div>
        </div>

      </div>
      
      {/* --- Resize Handles --- */}
      <div 
          className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-indigo-500/20 z-50"
          onMouseDown={(e) => handleMouseDownResize(e, 'right')}
      />
      <div 
          className="absolute left-0 bottom-0 right-0 h-1 cursor-ns-resize hover:bg-indigo-500/20 z-50"
          onMouseDown={(e) => handleMouseDownResize(e, 'bottom')}
      />
      <div 
          className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize bg-transparent hover:bg-indigo-500/20 rounded-br-xl z-50"
          onMouseDown={(e) => handleMouseDownResize(e, 'bottom-right')}
      />
    </div>
  );
};

export default App;