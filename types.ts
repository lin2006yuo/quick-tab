import React from 'react';

export interface Tab {
  id: number;
  title: string;
  url: string;
  favIconUrl: string;
  isActive: boolean;
  tags: string[];
  isPinned: boolean;
  pinnedAt?: number;
  isBookmarked?: boolean;
  bookmarkGroupId?: string;
  note?: string; // Additional information
}

export enum InputMode {
  SEARCH = 'SEARCH',
  COMMAND_SELECT = 'COMMAND_SELECT', // User typed '/' and is choosing a command
  COMMAND_ACTIVE = 'COMMAND_ACTIVE', // User confirmed a command (e.g., inside /mark)
}

export enum CommandType {
  MARK = 'mark',
  CLOSE = 'close', // Future extension
  MUTE = 'mute',   // Future extension
}

export interface CommandDefinition {
  id: CommandType;
  trigger: string; // e.g., "mark"
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