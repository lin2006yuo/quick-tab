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
  
  // Navigation indices
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Derived State ---

  // Filter tabs based on query and mode
  const filteredTabs = useMemo(() => {
    // Case 1: In Mark Command Mode -> Show only the active tab so user knows what they are marking
    if (inputMode === InputMode.COMMAND_ACTIVE && activeCommand?.id === CommandType.MARK) {
      return tabs.filter(t => t.isActive);
    }

    // Case 2: Command Selection Mode -> Show all tabs (background context)
    if (inputMode === InputMode.COMMAND_SELECT) {
       return tabs; 
    }

    // Case 3: Search Mode -> Filter by query
    if (!query) return tabs;
    const lowerQ = query.toLowerCase();
    return tabs.filter(t => 
      t.title.toLowerCase().includes(lowerQ) || 
      t.url.toLowerCase().includes(lowerQ) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQ))
    );
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

  // Reset selection indices
  useEffect(() => { setSelectedTabIndex(0); }, [filteredTabs]);
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
    
    let targetTabId: number | null = null;

    setTabs(prev => prev.map(tab => {
      if (tab.isActive) {
        targetTabId = tab.id;
        // Prevent duplicate tags
        if (tab.tags.includes(tagName.trim())) return tab;
        return { ...tab, tags: [...tab.tags, tagName.trim()] };
      }
      return tab;
    }));

    // Trigger Highlight Effect
    if (targetTabId) {
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

    setTabs(prev => prev.map(tab => {
      if (tab.id === tabId) {
        if (tab.tags.includes(trimmedTag)) return tab;
        return { ...tab, tags: [...tab.tags, trimmedTag] };
      }
      return tab;
    }));
  };

  const handleRemoveTag = (tabId: number, tagToRemove: string) => {
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

  const handleTabClick = (tab: Tab) => {
    // Requirement: "点击 tab 可以将 tab 内容显示会输入框"
    setQuery(tab.title);
    setInputMode(InputMode.SEARCH);
    inputRef.current?.focus();
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
            />
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 bg-white border-t border-slate-100 text-[10px] text-slate-400 flex justify-between items-center shadow-[0_-1px_2px_rgba(0,0,0,0.02)] relative z-20">
            <div className="flex gap-3">
                {inputMode === InputMode.COMMAND_ACTIVE && activeCommand?.id === CommandType.MARK ? (
                     <span className="text-indigo-500 font-medium">Press Enter to apply tag</span>
                ) : (
                    <span>{filteredTabs.length} tabs found</span>
                )}
            </div>
            <div className="flex gap-3">
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