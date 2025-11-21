import React, { useState, useEffect, useRef } from 'react';
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

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-8">
          
          {/* Title Section */}
          <div className="flex flex-col gap-3">
             <div className="flex items-start gap-4">
                <div className="shrink-0 mt-1 w-12 h-12 flex items-center justify-center rounded-xl bg-slate-100 border border-slate-200 shadow-sm overflow-hidden">
                    {tab.favIconUrl ? (
                        <img src={tab.favIconUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <Globe className="w-6 h-6 text-slate-400" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <input 
                        type="text" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        className="w-full text-xl font-semibold text-slate-900 bg-transparent border-b-2 border-transparent focus:border-indigo-500 focus:outline-none focus:bg-slate-50 rounded px-1 transition-colors"
                        placeholder="Tab Title"
                    />
                    <div className="flex items-center gap-2 mt-1 px-1 text-xs text-slate-400">
                         <a href={tab.url} target="_blank" rel="noreferrer" className="hover:text-indigo-500 hover:underline truncate flex items-center gap-1">
                             {tab.url}
                             <ExternalLink className="w-3 h-3" />
                         </a>
                    </div>
                </div>
             </div>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center gap-4 border-y border-slate-100 py-4">
             <button 
                onClick={onTogglePin}
                className={`
                    flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-all
                    ${tab.isPinned 
                        ? 'bg-amber-50 border-amber-200 text-amber-700' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }
                `}
             >
                 <Pin className={`w-4 h-4 ${tab.isPinned ? 'fill-current' : ''}`} />
                 {tab.isPinned ? 'Pinned' : 'Pin Tab'}
             </button>
             
             <button 
                onClick={onToggleBookmark}
                className={`
                    flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-all
                    ${tab.isBookmarked 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }
                `}
             >
                 <Star className={`w-4 h-4 ${tab.isBookmarked ? 'fill-current' : ''}`} />
                 {tab.isBookmarked ? 'Bookmarked' : 'Bookmark'}
             </button>
          </div>

          {/* Tags Section */}
          <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <TagIcon className="w-4 h-4" />
                  <span>Tags</span>
              </div>
              <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-lg border border-slate-100">
                  {tab.tags.map(tag => (
                      <div key={tag} className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded text-xs text-slate-600 shadow-sm">
                          <span>{tag}</span>
                          <button 
                            onClick={() => onRemoveTag(tag)}
                            className="p-0.5 hover:bg-red-50 hover:text-red-500 rounded"
                          >
                              <X className="w-3 h-3" />
                          </button>
                      </div>
                  ))}
                  
                  {isAddingTag ? (
                      <div className="flex items-center gap-1">
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
                            className="w-24 text-xs border border-indigo-300 rounded px-2 py-1 outline-none shadow-sm"
                            placeholder="New Tag..."
                          />
                      </div>
                  ) : (
                      <button 
                        onClick={() => setIsAddingTag(true)}
                        className="flex items-center gap-1 px-2 py-1 rounded border border-dashed border-slate-300 text-xs text-slate-400 hover:text-indigo-500 hover:border-indigo-300 hover:bg-white transition-all"
                      >
                          <Plus className="w-3 h-3" />
                          Add Tag
                      </button>
                  )}
              </div>
          </div>

          {/* Notes Section */}
          <div className="flex flex-col gap-2 h-full">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <AlignLeft className="w-4 h-4" />
                  <span>Additional Notes</span>
              </div>
              <textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={handleNoteBlur}
                  placeholder="Add any details, reminders, or context about this tab here..."
                  className="w-full min-h-[200px] p-4 rounded-lg border border-slate-200 text-sm text-slate-700 leading-relaxed focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50/50 resize-y placeholder:text-slate-300 bg-slate-50/30"
              />
          </div>

        </div>
      </div>
    </div>
  );
};

export default TabDetails;