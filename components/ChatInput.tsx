
import React, { useState, useRef } from 'react';
import { SendIcon, PaperclipIcon, SearchIcon } from './Icons';
import { Attachment } from '../types';

interface ChatInputProps {
  onSendMessage: (content: string, attachments: Attachment[]) => void;
  isLoading: boolean;
  useSearch: boolean;
  setUseSearch: (v: boolean) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, useSearch, setUseSearch }) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((!content.trim() && attachments.length === 0) || isLoading) return;
    onSendMessage(content, attachments);
    setContent('');
    setAttachments([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        const blobUrl = URL.createObjectURL(file);
        setAttachments(prev => [...prev, {
          mimeType: file.type,
          data: base64,
          url: blobUrl
        }]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-slate-900/50 backdrop-blur-xl border-t border-slate-800">
      <div className="max-w-4xl mx-auto space-y-4">
        {attachments.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {attachments.map((att, idx) => (
              <div key={idx} className="relative group shrink-0">
                {att.mimeType.startsWith('image/') ? (
                  <img src={att.url} className="h-20 w-20 object-cover rounded-lg border border-slate-700" />
                ) : (
                  <div className="h-20 w-20 bg-slate-800 rounded-lg flex items-center justify-center text-[10px] text-slate-400 p-2 text-center">
                    {att.mimeType}
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(idx)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-3 bg-slate-800/80 p-3 rounded-2xl border border-slate-700 shadow-2xl transition-all focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="上傳檔案"
            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-colors"
          >
            <PaperclipIcon />
          </button>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="問問 Gemini 任何事..."
            rows={1}
            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-100 placeholder-slate-500 resize-none py-2 max-h-48 scrollbar-hide"
            style={{ height: 'auto' }}
          />

          <div className="flex items-center gap-2">
            <button
              onClick={() => setUseSearch(!useSearch)}
              title="使用 Google 搜尋增強回答"
              className={`p-2.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-medium ${
                useSearch 
                ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50' 
                : 'text-slate-500 hover:bg-slate-700'
              }`}
            >
              <SearchIcon />
              <span className="hidden sm:inline">聯網搜尋</span>
            </button>

            <button
              onClick={handleSend}
              disabled={isLoading || (!content.trim() && attachments.length === 0)}
              title="傳送訊息"
              className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <SendIcon />
              )}
            </button>
          </div>
        </div>
        <p className="text-[10px] text-center text-slate-600">
          Gemini 可能會顯示不準確的資訊，包括有關他人的資訊，因此請仔細檢查其回覆。
        </p>
      </div>
    </div>
  );
};

export default ChatInput;
