
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatInput from './components/ChatInput';
import MessageList from './components/MessageList';
import { SettingsIcon } from './components/Icons';
import { ChatSession, Message, Role, GeminiModel, Attachment, Provider, PullProgress, ImageSize } from './types';
import { geminiService } from './services/geminiService';
import { localModelService } from './services/localModelService';

// --- 全球最完整 Google Gemini 模型清單 ---
const GEMINI_LIBRARY_GROUPS = [
  {
    group: "NANO BANANA 影像生成 (頂級)",
    items: [
      { name: 'gemini-3-pro-image-preview', desc: 'Nano Banana Pro - 支援 4K、超寫實人物、光影細膩、聯網增強 (需付費金鑰)', tag: '4K/寫實' },
      { name: 'gemini-2.5-flash-image', desc: 'Nano Banana - 基礎影像生成，速度極快，適合創意發想', tag: '極速' },
    ]
  },
  {
    group: "旗艦推理與通用 (Gemini 3)",
    items: [
      { name: 'gemini-3-pro-preview', desc: 'Gemini 3 Pro - 目前最強推理模型，適合長文本與編碼', tag: 'SOTA' },
      { name: 'gemini-3-flash-preview', desc: 'Gemini 3 Flash - 速度與品質的最佳平衡點', tag: '首選' },
    ]
  },
  {
    group: "原生音訊與多模態",
    items: [
      { name: 'gemini-2.5-flash-native-audio-preview-09-2025', desc: '原生音訊對話 - 極低延遲語音互動', tag: '音訊' },
      { name: 'gemini-2.5-flash-preview-tts', desc: 'Gemini TTS - 頂級文字轉語音', tag: '語音' },
    ]
  },
  {
    group: "經典/穩定版本",
    items: [
      { name: 'gemini-flash-latest', desc: '2.5 Flash 穩定版', tag: '穩定' },
      { name: 'gemini-flash-lite-latest', desc: '2.5 Flash Lite 輕量版', tag: '節省' },
    ]
  }
];

// --- 全球最完整本地模型分組 (Ollama) ---
const OLLAMA_LIBRARY_GROUPS = [
  {
    group: "DeepSeek 推理系列 (當前最強)",
    items: [
      { name: 'deepseek-r1:1.5b', desc: '1.5B - 適合手機與低端 PC' },
      { name: 'deepseek-r1:7b', desc: '7B - 大多數用戶的最佳平衡' },
      { name: 'deepseek-r1:14b', desc: '14B - 邏輯能力顯著提升' },
      { name: 'deepseek-r1:32b', desc: '32B - 接近旗艦級推理' },
      { name: 'deepseek-r1:70b', desc: '70B - 旗艦推理，需 48GB VRAM' },
      { name: 'deepseek-r1:671b', desc: '671B - 本地極致完整版' },
    ]
  },
  {
    group: "Meta Llama 系列 (業界標準)",
    items: [
      { name: 'llama3.3:latest', desc: '70B 旗艦，Meta 當前最強' },
      { name: 'llama3.1:8b', desc: '8B 通用模型經典' },
      { name: 'llama3.2:3b', desc: '3B 輕量化對話首選' },
      { name: 'llama3.2:1b', desc: '1B 超微型模型' },
    ]
  },
  {
    group: "Qwen 阿里雲系列 (中文最強)",
    items: [
      { name: 'qwen2.5:0.5b', desc: '0.5B - 極小極速' },
      { name: 'qwen2.5:7b', desc: '7B - 中文理解最佳' },
      { name: 'qwen2.5:72b', desc: '72B - 阿里旗艦開源' },
      { name: 'qwen2.5-coder:7b', desc: '7B 程式碼專精' },
      { name: 'qwen2.5-coder:32b', desc: '32B 程式碼旗艦' },
    ]
  },
  {
    group: "視覺多模態 (可辨識影像)",
    items: [
      { name: 'llava:7b', desc: 'LLaVA - 經典看圖說話' },
      { name: 'moondream:latest', desc: '超輕量級視覺模型' },
      { name: 'bakllava', desc: '基於 Mistral 的視覺模型' },
    ]
  },
  {
    group: "醫療與利基模型",
    items: [
      { name: 'medllama2', desc: 'Llama 醫療優化版' },
      { name: 'dolphin-phi:latest', desc: '無審查、高創意模型' },
      { name: 'phi4', desc: '微軟 14B 推理力作' },
    ]
  }
];

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('gemini_nexus_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  
  const [activeSessionId, setActiveSessionId] = useState<string>(() => localStorage.getItem('gemini_nexus_active_id') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pullModelName, setPullModelName] = useState('');
  const [pullProgress, setPullProgress] = useState<PullProgress | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [localModels, setLocalModels] = useState<any[]>([]);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const pullAbortControllerRef = useRef<AbortController | null>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || null;
  const isLocal = activeSession?.provider === 'local';
  const isNanoBananaPro = activeSession?.model === 'gemini-3-pro-image-preview';

  // --- 解決「沒畫面」問題：確保至少有一個對話 ---
  const handleNewChat = useCallback(() => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: '新對話',
      messages: [],
      systemInstruction: '你是一個聰明、有創意且友好的助手。在影像生成模式下，請提供極其詳細的描述。',
      model: 'gemini-3-flash-preview',
      provider: 'gemini',
      apiBase: 'http://localhost:11434',
      useSearch: false,
      imageSize: '1K'
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
  }, []);

  useEffect(() => {
    if (sessions.length === 0) handleNewChat();
    else if (!activeSessionId) setActiveSessionId(sessions[0].id);
  }, [sessions.length, activeSessionId, handleNewChat]);

  // --- API Key 檢查邏輯 ---
  useEffect(() => {
    const checkKey = async () => {
      if (isNanoBananaPro) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setNeedsApiKey(!hasKey);
      } else {
        setNeedsApiKey(false);
      }
    };
    checkKey();
  }, [activeSession?.model, isNanoBananaPro]);

  const handleOpenSelectKey = async () => {
    await (window as any).aistudio.openSelectKey();
    setNeedsApiKey(false);
  };

  useEffect(() => {
    localStorage.setItem('gemini_nexus_sessions', JSON.stringify(sessions));
    if (activeSessionId) localStorage.setItem('gemini_nexus_active_id', activeSessionId);
  }, [sessions, activeSessionId]);

  const fetchLocalModels = useCallback(async () => {
    if (isLocal && activeSession?.apiBase) {
      try {
        const models = await localModelService.listLocalModels(activeSession.apiBase);
        setLocalModels(models);
      } catch (e) { setLocalModels([]); }
    }
  }, [isLocal, activeSession?.apiBase]);

  useEffect(() => { fetchLocalModels(); }, [fetchLocalModels]);

  const updateSession = (updates: Partial<ChatSession>) => {
    if (!activeSessionId) return;
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, ...updates } : s));
  };

  const handleSendMessage = async (content: string, attachments: Attachment[]) => {
    if (!activeSession) return;
    if (needsApiKey) { handleOpenSelectKey(); return; }

    const userMsg: Message = { id: Date.now().toString(), role: Role.USER, content, attachments, timestamp: Date.now() };
    const modelMsgId = (Date.now() + 1).toString();
    const initialModelMsg: Message = { id: modelMsgId, role: Role.MODEL, content: '', timestamp: Date.now() };
    
    if (activeSession.messages.length === 0 && content) updateSession({ title: content.slice(0, 20) });
    const currentMessages = [...activeSession.messages, userMsg];
    updateSession({ messages: [...currentMessages, initialModelMsg] });
    setIsLoading(true);

    try {
      let stream;
      if (activeSession.provider === 'gemini') {
        stream = geminiService.streamChat(
          activeSession.model as GeminiModel, 
          currentMessages, 
          activeSession.systemInstruction, 
          activeSession.useSearch,
          activeSession.imageSize || '1K'
        );
      } else {
        stream = localModelService.streamChat(activeSession.apiBase || 'http://localhost:11434', activeSession.model, currentMessages, activeSession.systemInstruction);
      }

      let fullContent = '';
      let resAttachments: Attachment[] = [];

      for await (const chunk of stream) {
        if (chunk.text) fullContent += chunk.text;
        if (chunk.attachments) resAttachments = [...resAttachments, ...chunk.attachments];
        
        setSessions(prev => prev.map(s => s.id === activeSessionId ? {
          ...s,
          messages: s.messages.map(m => m.id === modelMsgId ? { 
            ...m, 
            content: fullContent, 
            attachments: resAttachments.length > 0 ? resAttachments : m.attachments,
            groundingSources: chunk.groundingSources 
          } : m)
        } : s));
      }
    } catch (error) {
      setSessions(prev => prev.map(s => s.id === activeSessionId ? {
        ...s,
        messages: s.messages.map(m => m.id === modelMsgId ? { ...m, content: `系統錯誤: ${error instanceof Error ? error.message : '連線逾時'}` } : m)
      } : s));
    } finally {
      setIsLoading(false);
    }
  };

  if (!activeSession) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-blue-500 font-black animate-pulse">NEXUS 初始化中...</p>
    </div>
  );

  return (
    <div className={`flex h-screen text-slate-200 transition-all duration-700 ${isLocal ? 'bg-[#0a0c14]' : (isNanoBananaPro ? 'bg-[#14120a]' : 'bg-slate-950')}`}>
      <Sidebar sessions={sessions} activeSessionId={activeSessionId} onSelectSession={setActiveSessionId} onNewChat={handleNewChat} onDeleteSession={(id) => setSessions(prev => prev.filter(s => s.id !== id))} />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 backdrop-blur-2xl z-10 bg-black/20">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isLocal ? 'bg-indigo-500 shadow-[0_0_15px_#6366f1]' : (isNanoBananaPro ? 'bg-yellow-500 shadow-[0_0_15px_#eab308]' : 'bg-blue-500 shadow-[0_0_15px_#3b82f6]')}`}></div>
            <h1 className="font-black text-xl tracking-tighter uppercase">
              <span className={isNanoBananaPro ? 'text-yellow-500' : (isLocal ? 'text-indigo-400' : 'text-blue-500')}>
                {isNanoBananaPro ? 'Banana Pro' : (isLocal ? 'Local' : 'Gemini')}
              </span> Nexus
            </h1>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all active:scale-90 border border-transparent hover:border-white/10 shadow-lg"><SettingsIcon /></button>
        </header>

        {needsApiKey && (
          <div className="mx-4 my-2 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center text-yellow-500 font-black text-xl">!</div>
              <div>
                <h4 className="text-sm font-bold text-yellow-500">啟用 Nano Banana Pro 影像生成</h4>
                <p className="text-[10px] text-slate-500">此頂級模型需連結您的付費專案金鑰（Billing Enabled）</p>
              </div>
            </div>
            <button onClick={handleOpenSelectKey} className="px-5 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-black rounded-xl transition-all shadow-xl shadow-yellow-500/20">連結金鑰</button>
          </div>
        )}

        <MessageList messages={activeSession.messages} isTyping={isLoading} />
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} useSearch={activeSession.useSearch} setUseSearch={(v) => updateSession({ useSearch: v })} />

        {showSettings && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex items-center justify-end p-4">
            <div className="w-full max-w-xl h-full bg-[#111] border border-white/10 rounded-[2rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-y-auto animate-in slide-in-from-right duration-500 scrollbar-hide">
              <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
                <h2 className="text-2xl font-black tracking-tight">終端控制台</h2>
                <button onClick={() => setShowSettings(false)} className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-white text-3xl hover:bg-white/5 rounded-full">&times;</button>
              </div>

              <div className="space-y-10">
                <section>
                  <label className="block text-[10px] font-black text-slate-500 mb-4 uppercase tracking-[0.3em]">AI 算力提供商</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => updateSession({ provider: 'gemini', model: 'gemini-3-flash-preview' })} className={`py-5 px-4 rounded-[1.5rem] text-xs font-black border-2 transition-all ${activeSession.provider === 'gemini' ? 'bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.2)]' : 'bg-slate-900 border-white/5 text-slate-500 hover:border-white/10'}`}>GOOGLE CLOUD</button>
                    <button onClick={() => updateSession({ provider: 'local', model: 'llama3.2:3b' })} className={`py-5 px-4 rounded-[1.5rem] text-xs font-black border-2 transition-all ${activeSession.provider === 'local' ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.2)]' : 'bg-slate-900 border-white/5 text-slate-500 hover:border-white/10'}`}>LOCAL OLLAMA</button>
                  </div>
                </section>

                {!isLocal ? (
                  <section className="p-6 bg-white/5 rounded-[2rem] border border-white/10 space-y-6">
                    <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest">GEMINI 世界級模型庫</label>
                    <select value={activeSession.model} onChange={(e) => updateSession({ model: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none focus:border-blue-500/50 text-slate-200">
                      {GEMINI_LIBRARY_GROUPS.map(g => (
                        <optgroup key={g.group} label={g.group}>
                          {g.items.map(item => <option key={item.name} value={item.name}>[{item.tag}] {item.name}</option>)}
                        </optgroup>
                      ))}
                    </select>

                    {isNanoBananaPro && (
                      <div className="pt-6 border-t border-white/5 animate-in fade-in zoom-in duration-500">
                        <label className="block text-[10px] font-black text-yellow-500 mb-4 uppercase tracking-widest text-center">Nano Banana Pro 渲染精度</label>
                        <div className="grid grid-cols-3 gap-3">
                          {(['1K', '2K', '4K'] as ImageSize[]).map(size => (
                            <button 
                              key={size}
                              onClick={() => updateSession({ imageSize: size })}
                              className={`py-3 rounded-2xl text-[10px] font-black border-2 transition-all ${activeSession.imageSize === size ? 'bg-yellow-500 text-black border-yellow-400 shadow-xl' : 'bg-black border-white/5 text-slate-500'}`}
                            >
                              {size} {size === '4K' && '🔥'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                ) : (
                  <section className="p-6 bg-white/5 rounded-[2rem] border border-white/10 space-y-6">
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest">OLLAMA 全球模型鏡像</label>
                    <select value={pullModelName} onChange={(e) => setPullModelName(e.target.value)} disabled={isPulling} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none focus:border-indigo-500/50">
                      <option value="">快速選取下載目標...</option>
                      {OLLAMA_LIBRARY_GROUPS.map(g => (
                        <optgroup key={g.group} label={g.group}>
                          {g.items.map(item => <option key={item.name} value={item.name}>{item.name} ({item.desc})</option>)}
                        </optgroup>
                      ))}
                    </select>
                    {isPulling && pullProgress && (
                      <div className="space-y-2 py-2">
                        <div className="flex justify-between text-[10px] font-black"><span className="text-indigo-400 animate-pulse uppercase">{pullProgress.status}</span><span className="text-slate-400">{pullProgress.percent}%</span></div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden"><div className="bg-gradient-to-r from-indigo-600 to-blue-500 h-full transition-all duration-500" style={{width: `${pullProgress.percent}%`}}></div></div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {localModels.length > 0 ? localModels.map(m => (
                        <button key={m.name} onClick={() => updateSession({ model: m.name })} className={`px-4 py-2 rounded-xl text-[10px] font-mono border-2 transition-all ${activeSession.model === m.name ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-black border-white/5 text-slate-600 hover:text-slate-400'}`}>{m.name}</button>
                      )) : <p className="text-[10px] text-slate-700 italic px-2">尚未偵測到本地模型</p>}
                    </div>
                  </section>
                )}

                <section>
                  <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest pl-1">人格底層邏輯 (SYSTEM INSTRUCTION)</label>
                  <textarea value={activeSession.systemInstruction} onChange={(e) => updateSession({ systemInstruction: e.target.value })} rows={5} className="w-full bg-black/40 border border-white/10 rounded-3xl px-6 py-5 text-sm outline-none focus:border-white/20 transition-all resize-none text-slate-300 font-medium leading-relaxed" />
                </section>
                
                <button onClick={() => setShowSettings(false)} className={`w-full py-6 rounded-[2rem] text-sm font-black text-white shadow-2xl transition-all active:scale-[0.97] ${isLocal ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-blue-600 hover:bg-blue-500'}`}>儲存並返回 NEXUS</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
