import { useEffect, useRef, useState } from 'react';
import { Send, Bot, User as UserIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { detectIntent, type SupportReply } from '@/lib/supportAi';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  createdAt: number;
  intent?: SupportReply['intent'];
  suggestEscalation?: boolean;
  suggestedCategory?: string;
}

interface SupportChatProps {
  initialPrompt?: string | null;
  onEscalate: (opts: { category?: string; lastMessage?: string }) => void;
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const greeting: ChatMessage = {
  id: 'greeting',
  sender: 'ai',
  text:
    '¡Hola! 👋 Soy el asistente de YUSIOP. Cuéntame qué problema tienes y haré lo posible por ayudarte. Puedes escribir libremente o usar uno de los botones rápidos.',
  createdAt: Date.now(),
  intent: 'greeting',
};

export default function SupportChat({ initialPrompt, onEscalate }: SupportChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([greeting]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: uid(),
      sender: 'user',
      text: trimmed,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // Simula latencia natural del asistente
    const delay = 600 + Math.min(1200, trimmed.length * 12);
    setTimeout(() => {
      const reply = detectIntent(trimmed);
      const aiMsg: ChatMessage = {
        id: uid(),
        sender: 'ai',
        text: reply.text,
        createdAt: Date.now(),
        intent: reply.intent,
        suggestEscalation: reply.suggestEscalation,
        suggestedCategory: reply.suggestedCategory,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setTyping(false);
    }, delay);
  };

  // Procesar prompt inicial proveniente de los botones rápidos
  useEffect(() => {
    if (initialPrompt) {
      sendMessage(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const lastAi = [...messages].reverse().find((m) => m.sender === 'ai');

  return (
    <div className="blob-card flex flex-col h-[60vh] min-h-[420px] overflow-hidden">
      <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {typing && (
            <div className="flex items-start gap-2">
              <Avatar sender="ai" />
              <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:120ms]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:240ms]" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {lastAi?.suggestEscalation && !typing && (
        <div className="px-4 pb-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-full"
            onClick={() =>
              onEscalate({
                category: lastAi.suggestedCategory,
                lastMessage: [...messages].reverse().find((m) => m.sender === 'user')?.text,
              })
            }
          >
            <UserIcon className="h-3.5 w-3.5 mr-1.5" />
            Hablar con soporte humano
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t bg-background/40 backdrop-blur p-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu mensaje…"
          className="rounded-full"
          maxLength={1000}
          disabled={typing}
        />
        <Button type="submit" size="icon" className="rounded-full shrink-0" disabled={typing || !input.trim()}>
          {typing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}

function Avatar({ sender }: { sender: 'user' | 'ai' }) {
  if (sender === 'ai') {
    return (
      <div className="h-8 w-8 rounded-full vapor-bg flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4 text-primary-foreground" />
      </div>
    );
  }
  return (
    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
      <UserIcon className="h-4 w-4 text-foreground/70" />
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.sender === 'user';
  return (
    <div className={cn('flex items-start gap-2', isUser && 'flex-row-reverse')}>
      <Avatar sender={message.sender} />
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted text-foreground rounded-tl-sm',
        )}
      >
        {message.text}
      </div>
    </div>
  );
}
