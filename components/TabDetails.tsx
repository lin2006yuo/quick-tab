
import React, { useState, useEffect } from 'react';
import { Tab } from '../types';
import { ArrowLeft, Globe, ExternalLink, Star, Pin, Tag as TagIcon, Plus, X, AlignLeft } from 'lucide-react';

interface TabDetailsProps {
  tab: Tab;
  onClose: () => void;
  onRenameTab: (newTitle: string) => void;
  onTogglePin: () => void;
  onToggleBookmark: () => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onUpdateNote: (note: string) => void;
}

const TabDetails: React.FC<TabDetailsProps> = ({
  tab,
  onClose,
  onRenameTab,
  onTogglePin,
  onToggleBookmark,
  onAddTag,
  onRemoveTag,
  onUpdateNote
}) => {
  const [title, setTitle] = useState(tab.title);
  const [note, setNote] = useState(tab.note || '');
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Sync props to state if they change externally
  useEffect(() => {
    setTitle(tab.title);
    setNote(tab.note || '');
  }, [tab.id]); // Only reset if tab ID changes

  // Auto-save title on blur
  const handleTitleBlur = () => {
    if (title.trim() !== tab.title) {
      onRenameTab(title.trim());
    }
  };

  // Auto-save note on blur
  const handleNoteBlur = () => {
    if (note !== tab.note) {
      onUpdateNote(note);
    }
  };

  const handleAddTagSubmit = () => {
    if (newTag.trim()) {
      onAddTag(newTag.trim());
      setNewTag('');
      setIsAddingTag(false);
    } else {
      setIsAddingTag(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-white z-40 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header / Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
        <button 
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
          title="Back to list"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Tab Details</span>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="max-w-3xl mx-auto w-full h-full flex flex-col p-6 gap-6">
          
          {/* Top Section: Icon + Info + Compact Actions */}
          <div className="flex gap-4 shrink-0">
             <div className="shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-slate-100 border border-slate-200 shadow-sm overflow-hidden">
                {tab.favIconUrl ? (
                    <img src={tab.favIconUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                    <Globe className="w-6 h-6 text-slate-400" />
                )}
             </div>
             
             <div className="flex-1 min-w-0 flex flex-col gap-1">
                 <div className="flex items-start gap-3">
                    {/* Title Input */}
                    <input 
                        type="text" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        className="flex-1 text-lg font-semibold text-slate-900 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none rounded-sm px-0 transition-colors leading-tight"
                        placeholder="Tab Title"
                    />

                    {/* Compact Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                        <button 
                           onClick={onTogglePin}
                           className={`
                               p-1.5 rounded-md border transition-all
                               ${tab.isPinned 
                                   ? 'bg-amber-50 border-amber-200 text-amber-600' 
                                   : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                               }
                           `}
                           title={tab.isPinned ? "Unpin tab" : "Pin tab"}
                        >
                            <Pin className="w-4 h-4" fill={tab.isPinned ? "currentColor" : "none"} />
                        </button>
                        
                        <button 
                           onClick={onToggleBookmark}
                           className={`
                               p-1.5 rounded-md border transition-all
                               ${tab.isBookmarked 
                                   ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                                   : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                               }
                           `}
                           title={tab.isBookmarked ? "Remove bookmark" : "Bookmark"}
                        >
                            <Star className="w-4 h-4" fill={tab.isBookmarked ? "currentColor" : "none"} />
                        </button>
                    </div>
                 </div>
                 
                 {/* URL */}
                 <a href={tab.url} target="_blank" rel="noreferrer" className="text-xs text-slate-400 hover:text-indigo-500 hover:underline truncate flex items-center gap-1 max-w-full">
                     <ExternalLink className="w-3 h-3 shrink-0" />
                     <span className="truncate">{tab.url}</span>
                 </a>
             </div>
          </div>

          {/* Compact Tags Section */}
          <div className="flex items-start gap-3 shrink-0">
              <div className="shrink-0 pt-1 text-slate-400" title="Tags">
                  <TagIcon className="w-4 h-4" />
              </div>
              <div className="flex flex-wrap gap-2 flex-1">
                  {tab.tags.length === 0 && !isAddingTag && (
                      <span className="text-xs text-slate-400 italic pt-0.5">No tags</span>
                  )}
                  {tab.tags.map(tag => (
                      <div key={tag} className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-xs text-slate-600">
                          <span>{tag}</span>
                          <button 
                            onClick={() => onRemoveTag(tag)}
                            className="hover:text-red-500"
                          >
                              <X className="w-3 h-3" />
                          </button>
                      </div>
                  ))}
                  
                  {isAddingTag ? (
                      <input
                        autoFocus
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onBlur={handleAddTagSubmit}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddTagSubmit();
                            if (e.key === 'Escape') setIsAddingTag(false);
                        }}
                        className="w-24 text-xs border border-indigo-300 rounded px-2 py-0.5 outline-none bg-white"
                        placeholder="New Tag..."
                      />
                  ) : (
                      <button 
                        onClick={() => setIsAddingTag(true)}
                        className="px-2 py-0.5 rounded border border-dashed border-slate-300 text-xs text-slate-400 hover:text-indigo-500 hover:border-indigo-300 hover:bg-white transition-all flex items-center gap-1"
                      >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                      </button>
                  )}
              </div>
          </div>

          {/* Expanded Notes Section */}
          <div className="flex-1 flex flex-col min-h-0 gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <AlignLeft className="w-4 h-4" />
                  <span>Additional Notes</span>
              </div>
              <textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={handleNoteBlur}
                  placeholder="Add any details, reminders, or context about this tab here..."
                  className="flex-1 w-full p-4 rounded-lg border border-slate-200 text-sm text-slate-700 leading-relaxed focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 resize-none bg-slate-50/30"
              />
          </div>

        </div>
      </div>
    </div>
  );
};

export default TabDetails;
