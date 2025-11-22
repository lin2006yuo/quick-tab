import React from 'react';

// Represents a raw tab from the Browser (Ephemeral)
export interface ChromeTab {
  id: number;
  title: string;
  url: string;
  favIconUrl: string;
  active: boolean;
  pinned: boolean;
  audible?: boolean;
}

// Represents data stored permanently by URL (Persistent)
export interface TabMetadata {
  tags: string[];
  note: string;
  // We can store the title here to display bookmarks even if the tab is closed
  savedTitle?: string; 
  savedFavIconUrl?: string;
}

// Represents a Bookmark/Saved Item
export interface BookmarkItem {
  url: string;
  groupId: string;
  addedAt: number;
  pinned?: boolean; // New: Pin within the group
}

// The merged object used by the UI
export interface Tab {
  // Browser properties (might be null if tab is closed but bookmarked)
  id: number; // unique ID for UI (if live, use tabId, if bookmark-only, use negative hash)
  chromeTabId?: number; // undefined if tab is closed
  
  title: string;
  url: string;
  favIconUrl: string;
  isActive: boolean;
  isPinned: boolean; // Browser Tab Pin
  
  // App properties
  tags: string[];
  note?: string;
  
  // Bookmark properties
  isBookmarked: boolean;
  bookmarkGroupId?: string;
  isGroupPinned?: boolean; // New: Bookmark Group Pin
}

export enum InputMode {
  SEARCH = 'SEARCH',
  COMMAND_SELECT = 'COMMAND_SELECT',
  COMMAND_ACTIVE = 'COMMAND_ACTIVE',
}

export enum CommandType {
  MARK = 'mark',
  CLOSE = 'close', 
  MUTE = 'mute',
}

export interface CommandDefinition {
  id: CommandType;
  trigger: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export enum ViewMode {
  LIST = 'LIST',
  GROUPS = 'GROUPS',
  BOOKMARKS = 'BOOKMARKS'
}

export interface BookmarkGroup {
  id: string;
  title: string;
}