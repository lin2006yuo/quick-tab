import React, { useState, useEffect, useRef, useMemo } from 'react';
import { INITIAL_TABS, AVAILABLE_COMMANDS } from './constants';
import { Tab, InputMode, CommandDefinition, CommandType } from './types';
import TabList from './components/TabList';
import CommandMenu from './components/CommandMenu';
import { AppIcon, CmdKeyIcon } from './components/CommandIcon';

const App: React.FC = () => {
  // --- State ---
  const [isOpen, setIsOpen] = useState(true);
  const [tabs, setTabs] = useState<Tab[]>(INITIAL_TABS);
  const [query, setQuery] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>(InputMode.SEARCH);
  const [activeCommand, setActiveCommand] = useState<CommandDefinition | null>(null);
  
  // Visual Feedback State
  const [highlightedTabId, setHighlightedTabId] = useState<number | null>(null);
  const [targetTabIdToSelect, setTargetTabIdToSelect] = useState<number | null>(null);
  
  // Navigation indices
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const prevFilteredTabsRef = useRef<Tab[]>([]);

  // --- Derived State ---

  // Filter tabs based on query and mode
  const filteredTabs = useMemo(() => {
    // Case 1: In Mark Command Mode -> Show only the active tab so user knows what they are marking
    if (inputMode === InputMode.COMMAND_ACTIVE && activeCommand?.id === CommandType.MARK) {
      return tabs.filter(t => t.isActive);
    }

    let result = tabs;

    // Case 2: Command Selection Mode -> Show all tabs (background context)
    if (inputMode === InputMode.COMMAND_SELECT) {
       result = tabs; 
    }
    // Case 3: Search Mode -> Filter by query
    else if (query) {
      const lowerQ = query.toLowerCase();
      result = tabs.filter(t => 
        t.title.toLowerCase().includes(lowerQ) || 
        t.url.toLowerCase().includes(lowerQ) ||
        t.tags.some(tag => tag.toLowerCase().includes(lowerQ))
      );
    }

    // Sorting: Pinned tabs always come first, then sorted by pinnedAt time (append strategy)
    return [...result].sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      if (a.isPinned && b.isPinned) {
        return (a.pinnedAt || 0) - (b.pinnedAt || 0);
      }
      // Maintain original relative order for unpinned items
      return 0;
    });
  }, [tabs, query, inputMode, activeCommand]);

  // Filter commands based on query (only in COMMAND_SELECT mode)
  const filteredCommands = useMemo(() => {
    if (inputMode !== InputMode.COMMAND_SELECT) return [];
    const cmdQuery = query.slice(1).toLowerCase(); // remove '/'
    return AVAILABLE_COMMANDS.filter(cmd => 
      cmd.trigger.includes(cmdQuery)
    );
  }, [query, inputMode]);

  const selectedCommand = filteredCommands[selectedCommandIndex];

  // Calculate ghost text suffix (the part of command not yet typed)
  const ghostSuffix = useMemo(() => {
    if (inputMode !== InputMode.COMMAND_SELECT || !selectedCommand) return '';
    
    const fullTrigger = `/${selectedCommand.trigger}`;
    // Check if current query matches the start of this command
    if (fullTrigger.toLowerCase().startsWith(query.toLowerCase())) {
        return fullTrigger.slice(query.length);
    }
    return '';
  }, [query, inputMode, selectedCommand]);

  // --- Effects ---

  // Global Hotkey Listener (Cmd+E)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        if (!isOpen) {
          setQuery('');
          setInputMode(InputMode.SEARCH);
          setActiveCommand(null);
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      }
      
      if (e.key === 'Escape') {
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
  }, [isOpen, inputMode, query]);

  // Manage Selection Index Logic
  useEffect(() => {
    // Determine if the list content actually changed from the last render
    const listChanged = prevFilteredTabsRef.current !== filteredTabs;
    prevFilteredTabsRef.current = filteredTabs;

    if (targetTabIdToSelect !== null) {
      // Priority 1: If we have a specific target tab to select (e.g. after pinning), find it
      const newIndex = filteredTabs.findIndex(t => t.id === targetTabIdToSelect);
      if (newIndex !== -1) {
        setSelectedTabIndex(newIndex);
      }
      // Reset the target immediately so future renders don't get stuck trying to select it
      setTargetTabIdToSelect(null);
    } else if (listChanged) {
      // Priority 2: If the list changed (e.g. typing search) AND we don't have a target, reset to top
      setSelectedTabIndex(0);
    }
    // If neither happened (e.g. just clearing targetTabIdToSelect), we do nothing, 
    // correctly preserving the current selection index.
  }, [filteredTabs, targetTabIdToSelect]);

  useEffect(() => { setSelectedCommandIndex(0); }, [filteredCommands]);


  // --- Handlers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    
    // 1. Trigger Command Select Mode
    if (inputMode === InputMode.SEARCH && val === '/') {
      setInputMode(InputMode.COMMAND_SELECT);
      setQuery(val);
      return;
    }

    // 2. Exit Command Select Mode if backspace removes '/'
    if (inputMode === InputMode.COMMAND_SELECT && val === '') {
      setInputMode(InputMode.SEARCH);
      setQuery('');
      return;
    }

    setQuery(val);
  };

  const executeMarkCommand = (tagName: string) => {
    if (!tagName.trim()) return;
    
    // Robustly find active tab first
    const activeTab = tabs.find(t => t.isActive);
    const targetTabId = activeTab?.id;

    if (targetTabId) {
        setTargetTabIdToSelect(targetTabId); // Preserve selection on this tab
        
        setTabs(prev => prev.map(tab => {
            if (tab.id === targetTabId) {
                // Prevent duplicate tags
                if (tab.tags.includes(tagName.trim())) return tab;
                return { ...tab, tags: [...tab.tags, tagName.trim()] };
            }
            return tab;
        }));

        // Trigger Highlight Effect
        setHighlightedTabId(targetTabId);
        setTimeout(() => setHighlightedTabId(null), 2000);
    }

    // Reset UI
    setQuery('');
    setInputMode(InputMode.SEARCH);
    setActiveCommand(null);
  };

  const handleAddTag = (tabId: number, tagName: string) => {
    const trimmedTag = tagName.trim();
    if (!trimmedTag) return;

    setTargetTabIdToSelect(tabId); // Keep selection on this tab

    setTabs(prev => prev.map(tab => {
      if (tab.id === tabId) {
        if (tab.tags.includes(trimmedTag)) return tab;
        return { ...tab, tags: [...tab.tags, trimmedTag] };
      }
      return tab;
    }));
  };

  const handleRemoveTag = (tabId: number, tagToRemove: string) => {
    setTargetTabIdToSelect(tabId); // Keep selection on this tab
    setTabs(prev => prev.map(tab => {
      if (tab.id === tabId) {
        return { ...tab, tags: tab.tags.filter(t => t !== tagToRemove) };
      }
      return tab;
    }));
  };

  const handleRenameTag = (tabId: number, oldTag: string, newTag: string) => {
    const trimmedNewTag = newTag.trim();
    if (trimmedNewTag === oldTag) return; // No change

    setTargetTabIdToSelect(tabId); // Keep selection on this tab

    setTabs(prev => prev.map(tab => {
      if (tab.id !== tabId) return tab;
      
      // If new tag is empty, treat as delete
      if (!trimmedNewTag) {
        return { ...tab, tags: tab.tags.filter(t => t !== oldTag) };
      }

      // Check if new tag already exists (merge)
      if (tab.tags.includes(trimmedNewTag)) {
        // Remove the old tag, keep the existing new tag (effectively merging)
        return { ...tab, tags: tab.tags.filter(t => t !== oldTag) };
      }

      // Standard rename
      return {
        ...tab,
        tags: tab.tags.map(t => t === oldTag ? trimmedNewTag : t)
      };
    }));
  };

  const handleRenameTab = (tabId: number, newTitle: string) => {
    if (!newTitle.trim()) return; // Don't allow empty titles
    
    setTargetTabIdToSelect(tabId); // Keep selection on this tab (important if sorting by name later)

    setTabs(prev => prev.map(tab => {
      if (tab.id === tabId) {
        return { ...tab, title: newTitle.trim() };
      }
      return tab;
    }));
  };

  const handleTogglePin = (tabId: number) => {
    setTargetTabIdToSelect(tabId); // Follow the tab to its new position (pinned/unpinned)

    setTabs(prev => prev.map(tab => {
      if (tab.id === tabId) {
        const newIsPinned = !tab.isPinned;
        return { 
          ...tab, 
          isPinned: newIsPinned,
          // When pinning, set current timestamp to allow sorting by pinned time (append strategy)
          pinnedAt: newIsPinned ? Date.now() : undefined 
        };
      }
      return tab;
    }));
  };
  
  // Reorder pinned tabs: move 'fromId' to the position of 'toId'
  // if toId is 'END', move to the end of the list
  const handleReorderPinnedTabs = (fromId: number, toId: number | 'END') => {
      setTargetTabIdToSelect(fromId); // Ensure selection follows the dragged item

      setTabs(prevTabs => {
          // 1. Extract pinned tabs and sort them by current order
          const pinnedTabs = prevTabs
            .filter(t => t.isPinned)
            .sort((a, b) => (a.pinnedAt || 0) - (b.pinnedAt || 0));
            
          const fromIndex = pinnedTabs.findIndex(t => t.id === fromId);
          
          let toIndex = -1;
          if (toId === 'END') {
              toIndex = pinnedTabs.length; // Insert at end
          } else {
              toIndex = pinnedTabs.findIndex(t => t.id === toId);
          }
          
          if (fromIndex === -1 || toIndex === -1) return prevTabs;
          
          // 2. Move element in the pinned array
          const item = pinnedTabs[fromIndex];
          const newPinnedOrder = [...pinnedTabs];
          newPinnedOrder.splice(fromIndex, 1);
          
          // If we removed the item from a lower index, the target index might need adjustment if we are inserting after
          // But 'splice(index, 0, item)' always inserts *at* that index, shifting subsequent items right.
          // So if toId was "Item B" and we want to insert before Item B, index is correct.
          // If toId was 'END', index is length, so it appends.
          // However, if we are moving DOWN the list, the removal shifts indices. 
          // 'pinnedTabs' is a snapshot, so 'toIndex' based on snapshot is correct destination index relative to original list.
          // But for array mutation:
          // If from < to: we remove 'from' (indices > from shift down by 1). We want to insert at 'to'.
          // Since 'to' index shifted down by 1, we should insert at 'to - 1'.
          // Example: [A, B, C, D]. Move A (0) to C (2). Remove A -> [B, C, D]. Insert at 2? -> [B, C, A, D]. 
          // Correct: A is now after C.
          
          // Correction for array mutation logic:
          let insertIndex = toIndex;
          if (fromIndex < toIndex) {
              insertIndex = toIndex - 1;
          }
          
          newPinnedOrder.splice(insertIndex, 0, item);
          
          // 3. Assign new "normalized" timestamps to preserve this specific order
          const reorderedIds = new Map(newPinnedOrder.map((t, index) => [t.id, index]));
          
          return prevTabs.map(tab => {
              if (tab.isPinned && reorderedIds.has(tab.id)) {
                  return { ...tab, pinnedAt: reorderedIds.get(tab.id) };
              }
              return tab;
          });
      });
  };

  const handleTabClick = (tab: Tab) => {
    // Requirement: "点击 tab 可以将 tab 内容显示会输入框"
    setQuery(tab.title);
    setInputMode(InputMode.SEARCH);
    inputRef.current?.focus();
  };

  // Helper to restore focus to main input after inline edits (rename, add tag, etc.)
  const handleEditEnd = () => {
    // Use timeout to ensure any local blur events settle and components unmount
    setTimeout(() => {
        inputRef.current?.focus();
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Backspace to exit Command Active Mode (when input is empty)
    if (e.key === 'Backspace') {
      if (inputMode === InputMode.COMMAND_ACTIVE && query.length === 0) {
        e.preventDefault();
        setInputMode(InputMode.SEARCH);
        setActiveCommand(null);
        return;
      }
    }
    
    // Keyboard Reordering for Pinned Tabs (Alt + Up/Down)
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const currentTab = filteredTabs[selectedTabIndex];
        
        if (currentTab && currentTab.isPinned) {
            // Get only pinned tabs from the filtered list to determine neighbors
            const pinnedTabs = filteredTabs.filter(t => t.isPinned);
            const currentIndexInPinned = pinnedTabs.findIndex(t => t.id === currentTab.id);
            
            if (e.key === 'ArrowUp' && currentIndexInPinned > 0) {
                const targetTab = pinnedTabs[currentIndexInPinned - 1];
                handleReorderPinnedTabs(currentTab.id, targetTab.id);
            } else if (e.key === 'ArrowDown' && currentIndexInPinned < pinnedTabs.length - 1) {
                const targetTab = pinnedTabs[currentIndexInPinned + 1];
                handleReorderPinnedTabs(currentTab.id, targetTab.id); // Insert before next is effectively swapping down
                // Actually, inserting before the next one swaps active with next.
                // If I am A, and Next is B. I want to be after B.
                // Reorder(A, B) inserts A before B. That's not moving down.
                // Reorder(A, C) inserts A before C (after B).
                
                // Fix for Keyboard: To move DOWN, we need to target the item *after* the immediate neighbor
                // OR use the 'END' logic if it's the second to last item.
                // Example: [A, B, C]. Move A down. Target C. Result: [B, A, C]. Correct.
                // Example: [A, B]. Move A down. Target END. Result: [B, A]. Correct.
                
                const nextNeighbor = pinnedTabs[currentIndexInPinned + 1];
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
        setSelectedTabIndex(prev => (prev + 1) % filteredTabs.length);
      }
    } 
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (inputMode === InputMode.COMMAND_SELECT) {
        setSelectedCommandIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else {
        setSelectedTabIndex(prev => (prev - 1 + filteredTabs.length) % filteredTabs.length);
      }
    } 
    else if (e.key === 'Enter') {
      e.preventDefault();
      
      if (inputMode === InputMode.COMMAND_SELECT) {
        // Logic: Autocomplete first, then enter mode on second Enter
        const cmd = filteredCommands[selectedCommandIndex];
        if (cmd) {
          const fullTrigger = `/${cmd.trigger}`;
          // If user hasn't typed the full command yet (e.g. "/m"), fill it first
          if (query.toLowerCase() !== fullTrigger.toLowerCase()) {
            setQuery(fullTrigger);
          } else {
            // If fully typed, enter the mode
            setActiveCommand(cmd);
            setInputMode(InputMode.COMMAND_ACTIVE);
            setQuery(''); // Clear for argument input
          }
        }
      } 
      else if (inputMode === InputMode.COMMAND_ACTIVE) {
        if (activeCommand?.id === CommandType.MARK) {
          executeMarkCommand(query);
        }
      } 
      else if (inputMode === InputMode.SEARCH) {
        const tab = filteredTabs[selectedTabIndex];
        if (tab) {
          // Standard action: Alert or Switch (simulated)
          alert(`Switching to tab: ${tab.title}`);
        }
      }
    }
  };

  if (!isOpen) {
    return (
      <div className="flex flex-col items-center gap-4 text-slate-400 mt-20">
        <p>Press <span className="font-mono bg-slate-200 px-2 py-1 rounded text-slate-600">Cmd + E</span> to open Tab Commander</p>
      </div>
    );
  }

  return (
    <div className="w-[650px] bg-white rounded-xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col text-slate-800 ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-150">
      
      {/* --- Header --- */}
      <div className="flex items-center px-4 py-3 border-b border-slate-100 bg-white relative z-20 gap-3 transition-all duration-200">
        
        {/* Left Icon / Badge Area */}
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

        {/* Input Area */}
        <div className="flex-1 relative h-9 flex items-center">
          {/* Ghost Text Overlay */}
          {inputMode === InputMode.COMMAND_SELECT && ghostSuffix && (
            <div className="absolute inset-0 pointer-events-none flex items-center text-lg overflow-hidden pl-[1px]" aria-hidden="true">
              {/* We render the query text invisibly to push the ghost suffix to the right position */}
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

      {/* --- Body --- */}
      <div className="relative min-h-[100px] flex flex-col bg-slate-50/50">
        
        {/* Command Menu Overlay (Now renders ON TOP of tabs) */}
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

        {/* Banner for Active Mark Mode */}
        {inputMode === InputMode.COMMAND_ACTIVE && activeCommand?.id === CommandType.MARK && (
          <div className="px-4 py-2 bg-indigo-50/50 border-b border-indigo-50 text-xs text-indigo-600 font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            <span>Marking Active Tab</span>
          </div>
        )}
        
        {/* Tab List - Always Rendered */}
        <div className="relative z-0">
           {inputMode === InputMode.COMMAND_SELECT && (
             <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-40" />
           )}
           <TabList 
              tabs={filteredTabs} 
              selectedIndex={selectedTabIndex} 
              highlightedTabId={highlightedTabId}
              onSelect={handleTabClick}
              onRemoveTag={handleRemoveTag}
              onRenameTag={handleRenameTag}
              onAddTag={handleAddTag}
              onRenameTab={handleRenameTab}
              onTogglePin={handleTogglePin}
              onEditEnd={handleEditEnd}
              onReorderPinnedTabs={handleReorderPinnedTabs}
            />
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 bg-white border-t border-slate-100 text-[10px] text-slate-400 flex flex-between items-center shadow-[0_-1px_2px_rgba(0,0,0,0.02)] relative z-20 justify-between">
            <div className="flex gap-3">
                {inputMode === InputMode.COMMAND_ACTIVE && activeCommand?.id === CommandType.MARK ? (
                     <span className="text-indigo-500 font-medium">Press Enter to apply tag</span>
                ) : (
                    <span>{filteredTabs.length} tabs found</span>
                )}
            </div>
            <div className="flex gap-3">
                <span className="flex items-center gap-1">
                    <kbd className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-sans text-slate-500">Alt</kbd> + <kbd className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-sans text-slate-500">↑↓</kbd> sort
                </span>
                <span className="flex items-center gap-1">
                    <kbd className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-sans text-slate-500">↑↓</kbd> navigate
                </span>
                <span className="flex items-center gap-1">
                    <kbd className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-sans text-slate-500">↵</kbd> select
                </span>
            </div>
        </div>

      </div>
    </div>
  );
};

export default App;