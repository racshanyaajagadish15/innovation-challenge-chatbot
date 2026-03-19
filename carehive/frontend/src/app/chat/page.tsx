'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { AuthGate } from '@/components/AuthGate';
import { motion } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const { userId, userRole, viewingPatientId } = useStore();
  const isMultiPatientRole = userRole === 'clinician' || userRole === 'family';
  const targetUserId = isMultiPatientRole ? (viewingPatientId || userId) : userId;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const { reply } = await api.chat(text, targetUserId ?? undefined);
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: "I couldn't reach the server. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGate>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="p-8 max-w-2xl mx-auto flex flex-col h-[calc(100vh-0px)]"
      >
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Chat with CAREHIVE</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Ask about medication, lifestyle, or how you’re feeling.</p>
        </div>

        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-8">
                Send a message to start. Try: “I forgot my meds yesterday” or “Tips for more steps?”
              </p>
            )}

            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-900/50 dark:text-slate-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </motion.div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-900/50 rounded-2xl px-4 py-2.5 text-slate-500 dark:text-slate-400 text-sm">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </CardContent>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Type a message..."
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <Button onClick={send} disabled={loading}>
              Send
            </Button>
          </div>
        </Card>
      </motion.div>
    </AuthGate>
  );
}
