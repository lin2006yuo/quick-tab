
import React from 'react';
import { ViewMode } from '../types';
import { List, Layers, Bookmark } from 'lucide-react';

interface ToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ viewMode, onViewModeChange }) => {
  return (
    <div className="flex items-center px-4 py-1.5 border-b border-slate-100 bg-slate-50/50">
      <div className="flex items-center gap-1 p-0.5 bg-slate-200/50 rounded-md">
        <button
          onClick={() => onViewModeChange(ViewMode.LIST)}
          className={`
            flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium transition-all
            ${viewMode === ViewMode.LIST 
              ? 'bg-white text-slate-700 shadow-sm ring-1 ring-black/5' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
            }
          `}
          title="List View (⌘1)"
        >
          <List className="w-3 h-3" />
          <span>List</span>
        </button>
        <button
          onClick={() => onViewModeChange(ViewMode.GROUPS)}
          className={`
            flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium transition-all
            ${viewMode === ViewMode.GROUPS
              ? 'bg-white text-slate-700 shadow-sm ring-1 ring-black/5' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
            }
          `}
          title="Group by Domain (⌘2)"
        >
          <Layers className="w-3 h-3" />
          <span>Groups</span>
        </button>
        <button
          onClick={() => onViewModeChange(ViewMode.BOOKMARKS)}
          className={`
            flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium transition-all
            ${viewMode === ViewMode.BOOKMARKS
              ? 'bg-white text-slate-700 shadow-sm ring-1 ring-black/5' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
            }
          `}
          title="Bookmarks (⌘3)"
        >
          <Bookmark className="w-3 h-3" />
          <span>Bookmarks</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;