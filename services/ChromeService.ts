import { ChromeTab, BookmarkGroup, BookmarkItem, TabMetadata } from '../types';
import { INITIAL_TABS, INITIAL_BOOKMARK_GROUPS } from '../constants';

/**
 * This Service mimics the behavior of a Chrome Extension background script
 * and the Chrome Storage API.
 */
class ChromeService {
  // --- "Browser" State (Ephemeral - mimics chrome.tabs) ---
  private liveTabs: ChromeTab[] = [];
  
  // --- "Extension" State (Persistent - mimics chrome.storage.local) ---
  private metadata: Record<string, TabMetadata> = {}; // Keyed by URL
  private bookmarks: BookmarkItem[] = [];
  private bookmarkGroups: BookmarkGroup[] = [];

  // --- Event Listeners ---
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
    this.simulateBrowserStartup();
  }

  /**
   * Subscribe to changes in the "Browser" or "Storage"
   */
  subscribe(callback: () => void) {
    this.listeners.add(callback);
    // Fix: Explicitly return void (by using a block) to satisfy useEffect cleanup signature which disallows boolean return
    return () => { this.listeners.delete(callback); };
  }

  private notify() {
    this.listeners.forEach(cb => cb());
    this.saveToStorage();
  }

  // --- Simulation Logic ---

  private loadFromStorage() {
    // In a real app, this would be chrome.storage.local.get
    const storedMeta = localStorage.getItem('tc_metadata');
    const storedBookmarks = localStorage.getItem('tc_bookmarks');
    const storedGroups = localStorage.getItem('tc_groups');

    if (storedMeta) this.metadata = JSON.parse(storedMeta);
    if (storedBookmarks) this.bookmarks = JSON.parse(storedBookmarks);
    
    this.bookmarkGroups = storedGroups 
      ? JSON.parse(storedGroups) 
      : INITIAL_BOOKMARK_GROUPS;
  }

  private saveToStorage() {
    // In a real app, this would be chrome.storage.local.set
    localStorage.setItem('tc_metadata', JSON.stringify(this.metadata));
    localStorage.setItem('tc_bookmarks', JSON.stringify(this.bookmarks));
    localStorage.setItem('tc_groups', JSON.stringify(this.bookmarkGroups));
  }

  private simulateBrowserStartup() {
    // Convert the mock constant data into "Raw Chrome Tabs"
    // We intentionally strip the extra fields to simulate a raw API
    this.liveTabs = INITIAL_TABS.map(t => ({
      id: t.id,
      title: t.title,
      url: t.url,
      favIconUrl: t.favIconUrl,
      active: t.isActive,
      pinned: t.isPinned,
      audible: false
    }));

    // Pre-populate metadata for the demo based on the mock constants
    // so the demo doesn't look empty, but only if storage is empty
    if (Object.keys(this.metadata).length === 0) {
        INITIAL_TABS.forEach(t => {
            if (t.tags.length > 0 || t.note) {
                this.updateMetadata(t.url, {
                    tags: t.tags,
                    note: t.note || '',
                    savedTitle: t.title,
                    savedFavIconUrl: t.favIconUrl
                }, false); // Don't notify yet
            }
        });
    }
  }

  // --- Public API: Data Access ---

  getLiveTabs(): ChromeTab[] {
    return this.liveTabs;
  }

  getMetadata(url: string): TabMetadata {
    return this.metadata[url] || { tags: [], note: '' };
  }

  getBookmarks(): BookmarkItem[] {
    return this.bookmarks;
  }

  getBookmarkGroups(): BookmarkGroup[] {
    return this.bookmarkGroups;
  }

  // --- Public API: Actions ---

  // 1. Tab Actions (Ephemeral)
  closeTab(tabId: number) {
    this.liveTabs = this.liveTabs.filter(t => t.id !== tabId);
    this.notify();
  }

  activateTab(tabId: number) {
    this.liveTabs = this.liveTabs.map(t => ({
      ...t,
      active: t.id === tabId
    }));
    // In real chrome, we'd use chrome.tabs.update(id, {active: true})
    this.notify();
  }

  togglePinTab(tabId: number) {
    this.liveTabs = this.liveTabs.map(t => {
        if (t.id === tabId) return { ...t, pinned: !t.pinned };
        return t;
    });
    this.notify();
  }

  reorderPinnedTabs(fromId: number, toId: number | 'END') {
      // Simple simulation of reordering in the browser array
      const fromIndex = this.liveTabs.findIndex(t => t.id === fromId);
      if (fromIndex === -1) return;
      
      const item = this.liveTabs[fromIndex];
      const newTabs = [...this.liveTabs];
      newTabs.splice(fromIndex, 1);
      
      // If 'END', put it after the last pinned tab
      if (toId === 'END') {
         // Fix: Replace findLastIndex with a backward loop for compatibility with older ES targets
         let lastPinnedIndex = -1;
         for (let i = newTabs.length - 1; i >= 0; i--) {
             if (newTabs[i].pinned) {
                 lastPinnedIndex = i;
                 break;
             }
         }
         newTabs.splice(lastPinnedIndex + 1, 0, item);
      } else {
          const toIndex = newTabs.findIndex(t => t.id === toId);
          // Simple heuristic for demo: insert before target
          newTabs.splice(toIndex, 0, item);
      }
      
      this.liveTabs = newTabs;
      this.notify();
  }

  // 2. Metadata Actions (Persistent)
  
  updateMetadata(url: string, updates: Partial<TabMetadata>, shouldNotify = true) {
    const current = this.getMetadata(url);
    
    // If we are adding metadata, we should also snapshot the title/icon
    // in case this becomes a "closed bookmark" later
    const tabSnapshot = this.liveTabs.find(t => t.url === url);
    const extraSnapshots = tabSnapshot ? {
        savedTitle: tabSnapshot.title,
        savedFavIconUrl: tabSnapshot.favIconUrl
    } : {};

    this.metadata[url] = { 
        ...current, 
        ...extraSnapshots,
        ...updates 
    };
    
    if (shouldNotify) this.notify();
  }

  addTag(url: string, tag: string) {
    const meta = this.getMetadata(url);
    if (!meta.tags.includes(tag)) {
        this.updateMetadata(url, { tags: [...meta.tags, tag] });
    }
  }

  removeTag(url: string, tag: string) {
    const meta = this.getMetadata(url);
    this.updateMetadata(url, { tags: meta.tags.filter(t => t !== tag) });
  }

  renameTag(url: string, oldTag: string, newTag: string) {
      const meta = this.getMetadata(url);
      const newTags = meta.tags.map(t => t === oldTag ? newTag : t);
      this.updateMetadata(url, { tags: newTags });
  }

  updateNote(url: string, note: string) {
      this.updateMetadata(url, { note });
  }

  renameTab(tabId: number, newTitle: string) {
      // This is a bit special. We rename the LIVE tab, but also save it to metadata
      // so if bookmarked, it keeps the custom name.
      const tab = this.liveTabs.find(t => t.id === tabId);
      if (tab) {
          tab.title = newTitle;
          this.updateMetadata(tab.url, { savedTitle: newTitle });
      }
  }

  // 3. Bookmark Actions (Persistent)

  toggleBookmark(url: string, title: string, defaultGroup = 'default') {
    const existingIndex = this.bookmarks.findIndex(b => b.url === url);
    if (existingIndex >= 0) {
        this.bookmarks.splice(existingIndex, 1);
    } else {
        this.bookmarks.push({
            url,
            groupId: defaultGroup,
            addedAt: Date.now(),
            pinned: false
        });
        // Ensure metadata exists for the bookmark to render properly when closed
        this.updateMetadata(url, { savedTitle: title }, false);
    }
    this.notify();
  }

  toggleBookmarkPin(url: string) {
      const bookmark = this.bookmarks.find(b => b.url === url);
      if (bookmark) {
          bookmark.pinned = !bookmark.pinned;
          this.notify();
      }
  }

  moveBookmark(url: string, targetGroupId: string) {
      const bookmark = this.bookmarks.find(b => b.url === url);
      if (bookmark) {
          bookmark.groupId = targetGroupId;
          this.notify();
      }
  }

  createBookmarkGroup(title: string) {
      this.bookmarkGroups.push({
          id: `group-${Date.now()}`,
          title
      });
      this.notify();
  }

  renameBookmarkGroup(groupId: string, newTitle: string) {
      const group = this.bookmarkGroups.find(g => g.id === groupId);
      if (group) {
          group.title = newTitle;
          this.notify();
      }
  }
}

export const chromeService = new ChromeService();