import React from 'react';
import { CommandDefinition } from '../types';

interface CommandMenuProps {
  commands: CommandDefinition[];
  selectedIndex: number;
  onSelect: (cmd: CommandDefinition) => void;
}

const CommandMenu: React.FC<CommandMenuProps> = ({ commands, selectedIndex, onSelect }) => {
  return (
    <div className="absolute top-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-lg z-50 max-h-[200px] overflow-y-auto">
      <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50 border-b border-slate-100">
        Suggested Commands
      </div>
      {commands.length === 0 ? (
         <div className="px-4 py-3 text-sm text-slate-400 italic">No matching commands</div>
      ) : (
        commands.map((cmd, index) => {
          const isSelected = index === selectedIndex;
          return (
            <div
              key={cmd.id}
              onClick={() => onSelect(cmd)}
              className={`
                flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm transition-colors border-l-2
                ${isSelected 
                  ? 'bg-indigo-50/80 border-indigo-500 text-slate-900' 
                  : 'border-transparent text-slate-600 hover:bg-slate-50'
                }
              `}
            >
              <div className={`${isSelected ? 'text-indigo-500' : 'text-slate-400'}`}>
                {cmd.icon}
              </div>
              <div className="flex flex-col">
                <span className="font-medium">/{cmd.trigger}</span>
                <span className="text-xs opacity-70">
                  {cmd.description}
                </span>
              </div>
              {isSelected && (
                <div className="ml-auto text-xs opacity-50 font-medium">
                  ↵
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default CommandMenu;