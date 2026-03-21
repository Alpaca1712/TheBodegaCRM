'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User } from 'lucide-react';
import { useParams } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function CopilotChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const params = useParams();

  const leadId = typeof params?.id === 'string' ? params.id : undefined;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          leadId,
          conversationHistory: messages.slice(-10),
        }),
      });

      if (!res.ok) throw new Error('Failed to get response');

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg shadow-red-600/25 hover:shadow-red-600/40 hover:scale-105 transition-all flex items-center justify-center"
          title="Open Co-pilot"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[560px] bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-black/10 dark:shadow-black/40 flex flex-col overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Co-pilot</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-500">
                  {leadId ? 'Scoped to current lead' : 'Pipeline-wide'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="h-7 w-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4 text-zinc-500" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                  <Bot className="h-5 w-5 text-zinc-400" />
                </div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Ask me anything</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 max-w-[240px]">
                  Strategy advice, lead insights, pipeline questions, or help drafting outreach.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="h-6 w-6 rounded-md bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="h-3 w-3 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[280px] px-3 py-2 rounded-xl text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-red-600 text-white rounded-br-md'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="h-6 w-6 rounded-md bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="h-3 w-3 text-zinc-600 dark:text-zinc-400" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="h-6 w-6 rounded-md bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-3 w-3 text-white" />
                </div>
                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl rounded-bl-md px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask the co-pilot..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-[13px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="h-9 w-9 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 text-white disabled:text-zinc-400 flex items-center justify-center transition-all flex-shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
