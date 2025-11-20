import React from 'react';
import { Command, Search } from 'lucide-react';

export const AppIcon = () => (
  <div className="w-5 h-5 flex items-center justify-center text-slate-400">
    <Search className="w-5 h-5" />
  </div>
);

export const CmdKeyIcon = () => (
  <span className="flex items-center justify-center w-5 h-5 bg-slate-100 rounded text-xs text-slate-500 border border-slate-200 shadow-sm">
    <Command className="w-3 h-3" />
  </span>
);
