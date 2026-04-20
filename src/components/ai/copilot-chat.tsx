'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { useParams } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const DEFAULT_PIPELINE_PROMPTS = [
  'What needs my attention today?',
  'Which leads are going stale?',
  'Who should I follow up with?',
  'How is my pipeline health?',
]

export default function CopilotChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const params = useParams();

  const leadId = typeof params?.id === 'string' ? params.id : undefined;

  // Reset suggestions when lead changes
  useEffect(() => {
    setSuggestedPrompts([]);
    setMessages([]);
  }, [leadId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const handler = () => setIsOpen(prev => !prev);
    document.addEventListener('toggle-copilot', handler);
    return () => document.removeEventListener('toggle-copilot', handler);
  }, []);

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
      if (data.suggested_prompts?.length) {
        setSuggestedPrompts(data.suggested_prompts);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const meta = e.metaKey || e.ctrlKey;
    if (e.key === 'Enter' && (meta || !e.shiftKey)) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
    // Auto-send after a brief tick so state updates
    setTimeout(() => {
      setInput(prompt);
      const userMessage: Message = { role: 'user', content: prompt };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: prompt,
          leadId,
          conversationHistory: [...messages, userMessage].slice(-10),
        }),
      })
        .then(async res => {
          if (!res.ok) throw new Error('Failed');
          const data = await res.json();
          setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
          if (data.suggested_prompts?.length) {
            setSuggestedPrompts(data.suggested_prompts);
          }
        })
        .catch(() => {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Try again.' }]);
        })
        .finally(() => setIsLoading(false));
    }, 0);
  };

  const activePrompts = messages.length === 0
    ? (leadId ? ['What should my next move be?', 'Grade my outreach so far', 'Draft a follow-up email', 'Which SMYKM hook is strongest?'] : DEFAULT_PIPELINE_PROMPTS)
    : suggestedPrompts;

  return (
    <>
      {/* Floating bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg shadow-red-600/25 hover:shadow-red-600/40 hover:scale-105 transition-all flex items-center justify-center"
          title="Open Co-pilot (G then C)"
          aria-label="Open Co-pilot"
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
              <div className="flex flex-col items-center justify-center h-full text-center py-6">
                <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                  <Bot className="h-5 w-5 text-zinc-400" />
                </div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Ask me anything</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 mb-4 max-w-[240px]">
                  Strategy advice, lead insights, pipeline questions, or help drafting outreach.
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center max-w-[320px]">
                  {activePrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestedPrompt(prompt)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-[11px] text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors border border-zinc-200 dark:border-zinc-700 hover:border-red-200 dark:hover:border-red-800"
                    >
                      <Sparkles className="h-2.5 w-2.5" />
                      {prompt}
                    </button>
                  ))}
                </div>
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
            {/* Suggested follow-up prompts after last assistant message */}
            {!isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && activePrompts.length > 0 && (
              <div className="flex flex-wrap gap-1 pl-8">
                {activePrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-50 dark:bg-zinc-800/50 hover:bg-red-50 dark:hover:bg-red-950/30 text-[10px] text-zinc-500 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors border border-zinc-100 dark:border-zinc-800 hover:border-red-200 dark:hover:border-red-800"
                  >
                    <Sparkles className="h-2 w-2" />
                    {prompt}
                  </button>
                ))}
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
                aria-label="Ask the co-pilot"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-[13px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
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
