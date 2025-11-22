import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X } from 'lucide-react';
import { AVAILABLE_COMMANDS, getDomain } from './constants';
import { Tab, InputMode, CommandDefinition, CommandType, ViewMode } from './types';
import TabList from './components/TabList';
import TabDetails from './components/TabDetails';
import CommandMenu from './components/CommandMenu';
import Toolbar from './components/Toolbar';
import { AppIcon } from './components/CommandIcon';
import { useTabManager } from './hooks/useTabManager';

const App: React.FC = () => {
  // --- Service Hook ---
  const { liveTabs, allBookmarkedTabs, bookmarkGroups, actions } = useTabManager();

  // --- Local UI State ---
  const [isOpen, setIsOpen] = useState(true);
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
  const prevViewModeRef = useRef<ViewMode>(viewMode);
  const dragRef = useRef<{ startX: number, startY: number, startLeft: number, startTop: number } | null>(null);
  const resizeRef = useRef<{ startX: number, startY: number, startW: number, startH: number, direction: string } | null>(null);
  const animationFrameRef = useRef<number>(0);


  // --- Derived State ---

  // Determine which source list to use based on View Mode
  const sourceTabs = viewMode === ViewMode.BOOKMARKS ? allBookmarkedTabs : liveTabs;

  // 1. Filter tabs based on query and mode
  const filteredTabs = useMemo(() => {
    if (inputMode === InputMode.COMMAND_ACTIVE && activeCommand?.id === CommandType.MARK) {
      return sourceTabs.filter(t => t.isActive);
    }

    let result = sourceTabs;

    if (inputMode === InputMode.COMMAND_SELECT) {
       result = sourceTabs; 
    }
    else if (query) {
      const lowerQ = query.toLowerCase();
      result = sourceTabs.filter(t => 
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
        // Sort by Group ID -> Pinned in Group -> Title
        return [...result].sort((a, b) => {
            const groupA = a.bookmarkGroupId || '';
            const groupB = b.bookmarkGroupId || '';
            const groupCompare = groupA.localeCompare(groupB);
            if (groupCompare !== 0) return groupCompare;
            
            // Sort pinned items to the top
            if (a.isGroupPinned !== b.isGroupPinned) {
                return a.isGroupPinned ? -1 : 1;
            }
            
            return a.title.localeCompare(b.title);
        });
    }

    // In List mode, Pinned items first
    return [...result].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  }, [sourceTabs, query, inputMode, activeCommand, viewMode]);

  // 2. Split into Pinned and Unpinned (Only for LIST mode)
  const pinnedTabs = useMemo(() => filteredTabs.filter(t => t.isPinned), [filteredTabs]);
  const unpinnedTabs = useMemo(() => filteredTabs.filter(t => !t.isPinned), [filteredTabs]);

  // 3. Construct the "Visible" list for Keyboard Navigation
  const visibleTabs = useMemo(() => {
      if (viewMode === ViewMode.GROUPS || viewMode === ViewMode.BOOKMARKS) {
        return filteredTabs;
      }
      if (isPinnedExpanded) {
          return [...pinnedTabs, ...unpinnedTabs];
      }
      return unpinnedTabs;
  }, [isPinnedExpanded, pinnedTabs, unpinnedTabs, viewMode, filteredTabs]);

  // 4. Get Active Details Tab (Search in both lists to be safe)
  const detailTab = useMemo(() => {
      return sourceTabs.find(t => t.id === detailTabId);
  }, [sourceTabs, detailTabId]);


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
  
  useEffect(() => {
      setWindowPos({
          x: Math.max(0, window.innerWidth / 2 - 325),
          y: 100
      });
      return () => {
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
  }, []);

  useEffect(() => {
      if (query.length > 0) setIsPinnedExpanded(true);
  }, [query]);

  // Actions needed for key handler
  const executeMarkCommand = (tagName: string) => {
    if (!tagName.trim()) return;
    const activeTab = liveTabs.find(t => t.isActive);
    if (activeTab) {
        setTargetTabIdToSelect(activeTab.id);
        actions.addTag(activeTab.id, tagName.trim());
        setHighlightedTabId(activeTab.id);
        setTimeout(() => setHighlightedTabId(null), 2000);
    }
    setQuery('');
    setInputMode(InputMode.SEARCH);
    setActiveCommand(null);
  };

  const executeCloseCommand = () => {
      const activeTab = liveTabs.find(t => t.isActive);
      if (activeTab) {
          actions.closeTab(activeTab.id);
      }
      setQuery('');
      setInputMode(InputMode.SEARCH);
      setActiveCommand(null);
  }

  const handleTabClick = (tab: Tab) => {
    actions.activateTab(tab.id);
    setQuery('');
    setInputMode(InputMode.SEARCH);
  };

  // --- GLOBAL KEY HANDLER ---
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isMainInput = target === inputRef.current;

      // GLOBAL SHORTCUTS (Always active)
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
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '1') { e.preventDefault(); setViewMode(ViewMode.LIST); inputRef.current?.focus(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === '2') { e.preventDefault(); setViewMode(ViewMode.GROUPS); inputRef.current?.focus(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === '3') { e.preventDefault(); setViewMode(ViewMode.BOOKMARKS); inputRef.current?.focus(); return; }

      // Cancel if typing in other inputs (like Rename or Notes)
      if (isInput && !isMainInput) return;

      // NAVIGATION & INTERACTION
      if (e.key === 'Escape') {
        if (detailTabId !== null) { setDetailTabId(null); return; }
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
      else if (e.key === 'Backspace') {
         if (inputMode === InputMode.COMMAND_ACTIVE && query.length === 0) {
           e.preventDefault();
           setInputMode(InputMode.SEARCH);
           setActiveCommand(null);
         }
      }
      else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          e.preventDefault();
          if (viewMode === ViewMode.GROUPS || viewMode === ViewMode.BOOKMARKS) return;
          // Only reorder if a valid item is selected
          if (selectedTabIndex === -1) return;
          
          const currentTab = visibleTabs[selectedTabIndex];
          if (currentTab && currentTab.isPinned) {
              const currentIndexInPinned = pinnedTabs.findIndex(t => t.id === currentTab.id);
              if (e.key === 'ArrowUp' && currentIndexInPinned > 0) {
                  const targetTab = pinnedTabs[currentIndexInPinned - 1];
                  actions.reorderPinnedTabs(currentTab.id, targetTab.id);
              } else if (e.key === 'ArrowDown' && currentIndexInPinned < pinnedTabs.length - 1) {
                  const targetAfterNeighbor = pinnedTabs[currentIndexInPinned + 2];
                  actions.reorderPinnedTabs(currentTab.id, targetAfterNeighbor ? targetAfterNeighbor.id : 'END');
              }
          }
      }
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (visibleTabs.length === 0 && inputMode !== InputMode.COMMAND_SELECT) return;

        if (inputMode === InputMode.COMMAND_SELECT) {
            setSelectedCommandIndex(prev => (prev + 1) % filteredCommands.length);
        } else {
            setSelectedTabIndex(prev => {
                // If unselected (-1), go to 0 (First)
                if (prev === -1) return 0;
                return (prev + 1) % visibleTabs.length;
            });
        }
      } 
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (visibleTabs.length === 0 && inputMode !== InputMode.COMMAND_SELECT) return;

        if (inputMode === InputMode.COMMAND_SELECT) {
            setSelectedCommandIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        } else {
            setSelectedTabIndex(prev => {
                // If unselected (-1), go to last
                if (prev === -1) return visibleTabs.length - 1;
                return (prev - 1 + visibleTabs.length) % visibleTabs.length;
            });
        }
      } 
      else if (e.key === 'Enter') {
        e.preventDefault();
        // If -1 selection in search mode (and not running command), do nothing (user needs to select first)
        if (selectedTabIndex === -1 && inputMode === InputMode.SEARCH && !activeCommand) return;

        if (inputMode === InputMode.COMMAND_SELECT) {
          const cmd = filteredCommands[selectedCommandIndex];
          if (cmd) {
            const fullTrigger = `/${cmd.trigger}`;
            if (query.toLowerCase() !== fullTrigger.toLowerCase()) setQuery(fullTrigger);
            else { setActiveCommand(cmd); setInputMode(InputMode.COMMAND_ACTIVE); setQuery(''); }
          }
        } else if (inputMode === InputMode.COMMAND_ACTIVE) {
          if (activeCommand?.id === CommandType.MARK) executeMarkCommand(query);
          if (activeCommand?.id === CommandType.CLOSE) executeCloseCommand();
        } else if (inputMode === InputMode.SEARCH) {
          const tab = visibleTabs[selectedTabIndex];
          if (tab) handleTabClick(tab);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [isOpen, inputMode, query, detailTabId, visibleTabs, filteredCommands, selectedCommandIndex, selectedTabIndex, activeCommand, viewMode, pinnedTabs, liveTabs]);

  // Selection Index Logic
  useEffect(() => {
    const listChanged = prevFilteredTabsRef.current !== visibleTabs;
    const viewModeChanged = prevViewModeRef.current !== viewMode;
    
    prevFilteredTabsRef.current = visibleTabs;
    prevViewModeRef.current = viewMode;

    if (targetTabIdToSelect !== null) {
      const newIndex = visibleTabs.findIndex(t => t.id === targetTabIdToSelect);
      if (newIndex !== -1) setSelectedTabIndex(newIndex);
      setTargetTabIdToSelect(null);
    } else if (viewModeChanged) {
        // Reset to unselected when switching main views
        setSelectedTabIndex(-1);
    } else if (listChanged) {
        // Reset to first item when list content changes (e.g. filtering)
        setSelectedTabIndex(0);
    }
  }, [visibleTabs, targetTabIdToSelect, viewMode]);

  useEffect(() => { setSelectedCommandIndex(0); }, [filteredCommands]);

  // --- Drag/Resize Handlers (Same as before) ---
  const handleMouseDownDrag = (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button, input, textarea')) return;
      dragRef.current = { startX: e.clientX, startY: e.clientY, startLeft: windowPos.x, startTop: windowPos.y };
      document.addEventListener('mousemove', handleMouseMoveDrag);
      document.addEventListener('mouseup', handleMouseUpDrag);
  };
  const handleMouseMoveDrag = (e: MouseEvent) => {
      if (!dragRef.current || !containerRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = requestAnimationFrame(() => {
          if (containerRef.current) containerRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      });
  };
  const handleMouseUpDrag = (e: MouseEvent) => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (dragRef.current && containerRef.current) {
          const dx = e.clientX - dragRef.current.startX;
          const dy = e.clientY - dragRef.current.startY;
          setWindowPos({ x: dragRef.current.startLeft + dx, y: dragRef.current.startTop + dy });
          containerRef.current.style.transform = 'none';
          containerRef.current.style.left = `${dragRef.current.startLeft + dx}px`;
          containerRef.current.style.top = `${dragRef.current.startTop + dy}px`;
      }
      dragRef.current = null;
      document.removeEventListener('mousemove', handleMouseMoveDrag);
      document.removeEventListener('mouseup', handleMouseUpDrag);
  };
  const handleMouseDownResize = (e: React.MouseEvent, direction: string) => {
      e.preventDefault(); e.stopPropagation();
      resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: windowSize.width, startH: windowSize.height, direction };
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
          if (containerRef.current) { containerRef.current.style.width = `${newW}px`; containerRef.current.style.height = `${newH}px`; }
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
          setWindowSize({ width: Math.max(400, newW), height: Math.max(300, newH) });
          containerRef.current.style.width = `${Math.max(400, newW)}px`;
          containerRef.current.style.height = `${Math.max(300, newH)}px`;
      }
      resizeRef.current = null;
      document.removeEventListener('mousemove', handleMouseMoveResize);
      document.removeEventListener('mouseup', handleMouseUpResize);
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
            left: windowPos.x, top: windowPos.y, width: windowSize.width, height: windowSize.height, transition: 'none'
        }}
    >
      {/* Drag Handle */}
      <div onMouseDown={handleMouseDownDrag} className="h-5 w-full bg-slate-50 border-b border-slate-100 flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0 z-50">
         <div className="w-12 h-1 bg-slate-200 rounded-full"></div>
      </div>
      
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-slate-100 bg-white relative z-20 gap-3 transition-all duration-200 shrink-0">
        {inputMode === InputMode.COMMAND_ACTIVE && activeCommand ? (
          <div className="flex shrink-0 items-center gap-2 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 select-none">
             <span className="text-slate-400">{React.cloneElement(activeCommand.icon as React.ReactElement<{ className?: string }>, { className: "w-3.5 h-3.5" })}</span>
             <span className="text-sm font-medium">{activeCommand.label}</span>
          </div>
        ) : (
          <div className="flex shrink-0 items-center justify-center w-6 h-6 ml-1 text-slate-400"><AppIcon /></div>
        )}

        <div className="flex-1 relative h-9 flex items-center group/input">
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
            onChange={(e) => {
                const val = e.target.value;
                if (inputMode === InputMode.SEARCH && val === '/') { setInputMode(InputMode.COMMAND_SELECT); setQuery(val); return; }
                if (inputMode === InputMode.COMMAND_SELECT && val === '') { setInputMode(InputMode.SEARCH); setQuery(''); return; }
                setQuery(val);
            }}
            // Note: onKeyDown removed, handling via global window listener for better focus safety
            placeholder={inputMode === InputMode.COMMAND_ACTIVE && activeCommand?.id === CommandType.MARK ? "Type tag name..." : "Search tabs or type '/'..."}
            className="w-full h-full bg-transparent text-lg outline-none text-slate-700 placeholder:text-slate-400 font-normal pr-8"
            autoComplete="off"
            autoFocus
          />
          {query.length > 0 && (
            <button 
              onClick={() => { setQuery(''); if (inputMode === InputMode.COMMAND_SELECT) setInputMode(InputMode.SEARCH); inputRef.current?.focus(); }}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-100 text-slate-300 hover:text-slate-500 opacity-0 group-hover/input:opacity-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
            {inputMode === InputMode.COMMAND_ACTIVE && <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">Esc to cancel</span>}
        </div>
      </div>

      <div className="shrink-0">
        <Toolbar 
            viewMode={viewMode} 
            onViewModeChange={(mode) => {
                setViewMode(mode);
                // Focus back to input for typing, but selection logic handles the visual reset
                inputRef.current?.focus();
            }} 
        />
      </div>

      {/* Body */}
      <div className="relative flex-1 flex flex-col bg-slate-50/50 min-h-0">
        {inputMode === InputMode.COMMAND_SELECT && (
          <div className="z-50">
             <CommandMenu 
              commands={filteredCommands} 
              selectedIndex={selectedCommandIndex}
              onSelect={(cmd) => { setActiveCommand(cmd); setInputMode(InputMode.COMMAND_ACTIVE); setQuery(''); inputRef.current?.focus(); }} 
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
           {inputMode === InputMode.COMMAND_SELECT && <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-40" />}
           
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
              onRemoveTag={(id, tag) => { setTargetTabIdToSelect(id); actions.removeTag(id, tag); }}
              onRenameTag={(id, oldT, newT) => { setTargetTabIdToSelect(id); actions.renameTag(id, oldT, newT); }}
              onAddTag={(id, tag) => { setTargetTabIdToSelect(id); actions.addTag(id, tag); }}
              onRenameTab={(id, title) => { setTargetTabIdToSelect(id); actions.renameTab(id, title); }}
              onTogglePin={(id) => { setTargetTabIdToSelect(id); actions.togglePin(id); }}
              onToggleBookmark={(id) => { setTargetTabIdToSelect(id); actions.toggleBookmark(id); }}
              onToggleGroupPin={(id) => { setTargetTabIdToSelect(id); actions.toggleGroupPin(id); }}
              onMoveBookmark={(id, gid) => { setTargetTabIdToSelect(id); actions.moveBookmark(id, gid); }}
              onCreateBookmarkGroup={actions.createBookmarkGroup}
              onRenameBookmarkGroup={actions.renameBookmarkGroup}
              onEditEnd={() => setTimeout(() => inputRef.current?.focus(), 10)}
              onReorderPinnedTabs={(f, t) => { setTargetTabIdToSelect(f); actions.reorderPinnedTabs(f, t); }}
              onOpenDetails={(id) => setDetailTabId(id)}
            />

           {detailTab && (
               <TabDetails 
                  tab={detailTab}
                  onClose={() => { setDetailTabId(null); setTimeout(() => inputRef.current?.focus(), 50); }}
                  onRenameTab={(title) => actions.renameTab(detailTab.id, title)}
                  onTogglePin={() => actions.togglePin(detailTab.id)}
                  onToggleBookmark={() => actions.toggleBookmarkByObj(detailTab)}
                  onAddTag={(tag) => actions.addTag(detailTab.id, tag)}
                  onRemoveTag={(tag) => actions.removeTag(detailTab.id, tag)}
                  onUpdateNote={(note) => actions.updateNote(detailTab.id, note)}
               />
           )}
        </div>
        
        <div className="shrink-0 px-4 py-2 bg-white border-t border-slate-100 text-[10px] text-slate-400 flex flex-between items-center shadow-[0_-1px_2px_rgba(0,0,0,0.02)] relative z-20 justify-between select-none">
            <div className="flex gap-3">
                {inputMode === InputMode.COMMAND_ACTIVE && activeCommand?.id === CommandType.MARK ? (
                     <span className="text-indigo-500 font-medium">Press Enter to apply tag</span>
                ) : (
                    <span>{visibleTabs.length} tabs found</span>
                )}
            </div>
            <div className="flex gap-3">
                {viewMode === ViewMode.LIST && <span className="flex items-center gap-1"><kbd className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-sans text-slate-500">Alt</kbd> + <kbd className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-sans text-slate-500">↑↓</kbd> sort</span>}
                <span className="flex items-center gap-1"><kbd className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-sans text-slate-500">×2</kbd> click details</span>
                <span className="flex items-center gap-1"><kbd className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-sans text-slate-500">↑↓</kbd> navigate</span>
                <span className="flex items-center gap-1"><kbd className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-sans text-slate-500">↵</kbd> select</span>
            </div>
        </div>
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-indigo-500/20 z-50" onMouseDown={(e) => handleMouseDownResize(e, 'right')} />
      <div className="absolute left-0 bottom-0 right-0 h-1 cursor-ns-resize hover:bg-indigo-500/20 z-50" onMouseDown={(e) => handleMouseDownResize(e, 'bottom')} />
      <div className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize bg-transparent hover:bg-indigo-500/20 rounded-br-xl z-50" onMouseDown={(e) => handleMouseDownResize(e, 'bottom-right')} />
    </div>
  );
};

export default App;