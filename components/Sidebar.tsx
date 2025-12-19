
import React from 'react';
import { ChatSession } from '../types';
import { PlusIcon, TrashIcon, HistoryIcon } from './Icons';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession
}) => {
  return (
    <aside className="w-80 h-full bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors py-2.5 rounded-xl font-medium text-white shadow-lg shadow-blue-500/20"
        >
          <PlusIcon /> 開啟新對話
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-1 py-2">
        <div className="flex items-center gap-2 px-3 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <HistoryIcon /> 對話歷史
        </div>
        {sessions.map(session => (
          <div
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
              activeSessionId === session.id
                ? 'bg-slate-800 text-white shadow-inner'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <div className="flex-1 truncate text-sm">
              {session.title || '無標題對話'}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(session.id);
              }}
              title="刪除對話"
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
            >
              <TrashIcon />
            </button>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="text-center py-8 text-slate-600 text-sm">
            目前沒有歷史紀錄
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
            訪客
          </div>
          <div className="text-sm font-medium text-slate-400">訪客用戶</div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
