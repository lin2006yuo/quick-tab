import { useState, useEffect, useMemo } from 'react';
import { Tab, ViewMode, ChromeTab, BookmarkItem } from '../types';
import { chromeService } from '../services/ChromeService';

export const useTabManager = () => {
  // We keep a local tick to force re-renders when service updates
  const [tick, setTick] = useState(0);

  useEffect(() => {
    return chromeService.subscribe(() => {
      setTick(t => t + 1);
    });
  }, []);

  // --- Merge Logic ---
  // Combines "Live Tabs" with "Persistent Metadata"
  
  const tabs: Tab[] = useMemo(() => {
    const liveTabs = chromeService.getLiveTabs();
    const bookmarks = chromeService.getBookmarks();
    
    return liveTabs.map((ct: ChromeTab) => {
      const meta = chromeService.getMetadata(ct.url);
      const bookmark = bookmarks.find(b => b.url === ct.url);
      
      return {
        id: ct.id, // Use Chrome Tab ID for live tabs
        chromeTabId: ct.id,
        title: ct.title,
        url: ct.url,
        favIconUrl: ct.favIconUrl,
        isActive: ct.active,
        isPinned: ct.pinned,
        tags: meta.tags,
        note: meta.note,
        isBookmarked: !!bookmark,
        bookmarkGroupId: bookmark?.groupId,
        isGroupPinned: bookmark?.pinned || false
      };
    });
  }, [tick]);

  const bookmarkGroups = useMemo(() => chromeService.getBookmarkGroups(), [tick]);

  // --- Bookmark View Logic ---
  // When viewing bookmarks, we need to include items that might NOT be currently open
  const getAllBookmarkedTabs = (): Tab[] => {
      const bookmarks = chromeService.getBookmarks();
      const liveTabs = chromeService.getLiveTabs();
      
      return bookmarks.map((b: BookmarkItem) => {
          // Is it open?
          const liveTab = liveTabs.find(t => t.url === b.url);
          const meta = chromeService.getMetadata(b.url);

          if (liveTab) {
              // Return the full live tab representation
              return {
                  id: liveTab.id,
                  chromeTabId: liveTab.id,
                  title: liveTab.title,
                  url: liveTab.url,
                  favIconUrl: liveTab.favIconUrl,
                  isActive: liveTab.active,
                  isPinned: liveTab.pinned,
                  tags: meta.tags,
                  note: meta.note,
                  isBookmarked: true,
                  bookmarkGroupId: b.groupId,
                  isGroupPinned: b.pinned || false
              };
          } else {
              // Return a "Ghost" tab (closed but bookmarked)
              // We generate a negative ID based on URL hash or just random to satisfy Key requirements
              // simplistic hash for demo
              const pseudoId = -1 * (b.url.split('').reduce((a,b) => {a=((a<<5)-a)+b.charCodeAt(0);return a&a},0));
              
              return {
                  id: pseudoId,
                  chromeTabId: undefined, // It's closed
                  title: meta.savedTitle || b.url,
                  url: b.url,
                  favIconUrl: meta.savedFavIconUrl || '',
                  isActive: false,
                  isPinned: false,
                  tags: meta.tags,
                  note: meta.note,
                  isBookmarked: true,
                  bookmarkGroupId: b.groupId,
                  isGroupPinned: b.pinned || false
              };
          }
      });
  };

  // --- Actions Handlers ---

  const actions = {
    closeTab: (id: number) => chromeService.closeTab(id),
    
    addTag: (id: number, tag: string) => {
        const tab = tabs.find(t => t.id === id);
        if(tab) chromeService.addTag(tab.url, tag);
    },
    
    removeTag: (id: number, tag: string) => {
        const tab = tabs.find(t => t.id === id);
        if(tab) chromeService.removeTag(tab.url, tag);
    },
    
    renameTag: (id: number, oldTag: string, newTag: string) => {
        const tab = tabs.find(t => t.id === id);
        if(tab) chromeService.renameTag(tab.url, oldTag, newTag);
    },

    togglePin: (id: number) => chromeService.togglePinTab(id),
    
    toggleBookmark: (id: number) => {
        const tab = tabs.find(t => t.id === id);
        if(tab) chromeService.toggleBookmark(tab.url, tab.title);
    },
    
    // Special overload for Bookmarks View (where we might interact with closed tabs)
    toggleBookmarkByObj: (tab: Tab) => {
        chromeService.toggleBookmark(tab.url, tab.title);
    },

    toggleGroupPin: (id: number) => {
        // Logic works for both live and ghost because we lookup by URL
        const all = getAllBookmarkedTabs();
        const tab = all.find(t => t.id === id);
        if(tab) chromeService.toggleBookmarkPin(tab.url);
    },

    moveBookmark: (id: number, groupId: string) => {
        // We need to find the URL. 
        // If it's a live tab, id is positive. If ghost, id is negative.
        // Use the tabs list or the bookmarks list generator to find it.
        const all = getAllBookmarkedTabs();
        const target = all.find(t => t.id === id);
        if (target) chromeService.moveBookmark(target.url, groupId);
    },

    createBookmarkGroup: (title: string) => chromeService.createBookmarkGroup(title),
    
    renameBookmarkGroup: (groupId: string, newTitle: string) => chromeService.renameBookmarkGroup(groupId, newTitle),

    renameTab: (id: number, title: string) => chromeService.renameTab(id, title),

    updateNote: (id: number, note: string) => {
        const tab = tabs.find(t => t.id === id);
        if(tab) chromeService.updateNote(tab.url, note);
    },

    reorderPinnedTabs: (fromId: number, toId: number | 'END') => {
        chromeService.reorderPinnedTabs(fromId, toId);
    },
    
    activateTab: (id: number) => {
        // Can only activate live tabs
        if (id > 0) chromeService.activateTab(id);
        else {
             // If it's a bookmark ghost, in a real app we would create a new tab
             window.open(getAllBookmarkedTabs().find(t => t.id === id)?.url, '_blank');
        }
    }
  };

  return {
    liveTabs: tabs, // These sync with Chrome
    allBookmarkedTabs: getAllBookmarkedTabs(), // These include closed items
    bookmarkGroups,
    actions
  };
};