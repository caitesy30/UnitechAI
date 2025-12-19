
import React, { useEffect, useRef } from 'react';
import { Message, Role } from '../types';
import { SearchIcon } from './Icons';

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isTyping }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-10 max-w-5xl mx-auto w-full scroll-smooth">
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-80 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 rounded-[2.5rem] bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/20">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-100 tracking-tighter">Nexus 系統就緒</h2>
            <p className="max-w-md text-slate-500 text-sm font-medium">切換至「影像生成」模型，即可生成 4K 高品質寫實人像。</p>
          </div>
        </div>
      )}
      
      {messages.map((msg) => (
        <div key={msg.id} className={`flex gap-5 ${msg.role === Role.USER ? 'flex-row-reverse' : 'animate-in slide-in-from-left-4 duration-300'}`}>
          <div className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center text-[10px] font-black border-2 shadow-lg transition-all ${
            msg.role === Role.USER 
              ? 'bg-slate-800 border-slate-700 text-slate-400' 
              : 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400/30 text-white'
          }`}>
            {msg.role === Role.USER ? 'ME' : 'AI'}
          </div>

          <div className={`flex flex-col max-w-[85%] ${msg.role === Role.USER ? 'items-end' : 'items-start'}`}>
            <div className={`rounded-3xl px-6 py-4 whitespace-pre-wrap text-sm leading-relaxed shadow-xl border ${
              msg.role === Role.USER 
                ? 'bg-slate-800/80 border-slate-700/50 text-slate-100 rounded-tr-none' 
                : 'bg-slate-900/80 text-slate-300 rounded-tl-none border-slate-800/80 backdrop-blur-sm'
            }`}>
              {msg.content}
              {msg.role === Role.MODEL && !msg.content && !msg.attachments && (
                <div className="flex gap-2 py-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
            </div>

            {msg.attachments && msg.attachments.length > 0 && (
              <div className={`mt-4 grid gap-3 ${msg.attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {msg.attachments.map((att, i) => (
                  <div key={i} className="group relative rounded-3xl overflow-hidden border border-slate-700/50 bg-slate-800 shadow-2xl transition-transform hover:scale-[1.02] active:scale-95">
                    {att.mimeType.startsWith('image/') ? (
                      <>
                        <img src={att.url} className="max-h-[500px] w-full object-cover" alt="Generated" />
                        <a href={att.url} download="nexus_gen.png" className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md p-2 rounded-xl text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </a>
                      </>
                    ) : (
                      <div className="p-6 text-xs text-slate-400 font-mono">FILE: {att.mimeType}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {msg.groundingSources && msg.groundingSources.length > 0 && (
              <div className="mt-5 flex flex-col gap-3 w-full">
                <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] pl-2">網路檢索來源</div>
                <div className="flex flex-wrap gap-2">
                  {msg.groundingSources.map((source, i) => (
                    <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-slate-800/40 border border-slate-700/30 rounded-2xl text-[11px] text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all">
                      <SearchIcon />
                      <span className="max-w-[150px] truncate">{source.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={endRef} className="h-10" />
    </div>
  );
};

export default MessageList;
