'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatUtcDateTime } from '@/lib/date-format';
import { createClient } from '@/lib/supabase/client';

type ChatMessage = {
  id: number;
  sender_id: string;
  receiver_id: string;
  message: string;
  timestamp: string;
};

export function RealtimeChat({
  title,
  description,
  currentUserId,
  peerUserId,
  initialMessages
}: {
  title: string;
  description: string;
  currentUserId: string;
  peerUserId: string;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [messages]
  );

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`chat-${currentUserId}-${peerUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async () => {
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('id,sender_id,receiver_id,message,timestamp')
          .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${peerUserId}),and(sender_id.eq.${peerUserId},receiver_id.eq.${currentUserId})`)
          .order('timestamp', { ascending: true })
          .limit(100);

        if (!fetchError) {
          setMessages((data as ChatMessage[]) ?? []);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, peerUserId]);

  async function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) {
      return;
    }

    setSending(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from('messages')
      .insert({
        sender_id: currentUserId,
        receiver_id: peerUserId,
        message: text.trim()
      })
      .select('id,sender_id,receiver_id,message,timestamp')
      .single();

    setSending(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setText('');
    setMessages((prev) => [...prev, data as ChatMessage]);
  }

  return (
    <Card className="border-blue-100/70 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
          {sorted.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
          {sorted.map((msg) => (
            <div key={msg.id} className={msg.sender_id === currentUserId ? 'text-right' : 'text-left'}>
              <div
                className={`inline-block max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  msg.sender_id === currentUserId
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-900'
                }`}
              >
                <p>{msg.message}</p>
                <p className={`mt-1 text-[10px] ${msg.sender_id === currentUserId ? 'text-slate-300' : 'text-muted-foreground'}`}>
                  {formatUtcDateTime(msg.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <form className="flex gap-2" onSubmit={onSend}>
          <Input placeholder="Type your message..." value={text} onChange={(event) => setText(event.target.value)} />
          <Button type="submit" disabled={sending}>
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
