import { useEffect, useState } from 'react';
import { ArrowLeft, HelpCircle, MessageCircle, Ticket, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import SupportChat from '@/components/support/SupportChat';
import EscalateTicketDialog from '@/components/support/EscalateTicketDialog';
import { QUICK_TOPICS, FAQ } from '@/lib/supportAi';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface MyTicket {
  id: string;
  subject: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  category: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Abierto',
  pending: 'En revisión',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  open: 'default',
  pending: 'secondary',
  resolved: 'outline',
  closed: 'outline',
};

export default function Support() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateCategory, setEscalateCategory] = useState<string | undefined>();
  const [escalateDescription, setEscalateDescription] = useState<string | undefined>();
  const [myTickets, setMyTickets] = useState<MyTicket[]>([]);

  const loadTickets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('support_tickets')
      .select('id, subject, status, category, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setMyTickets((data as MyTicket[]) ?? []);
  };

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleQuick = (topic: typeof QUICK_TOPICS[number]) => {
    if (topic.key === 'human') {
      setEscalateCategory('other');
      setEscalateDescription('');
      setEscalateOpen(true);
      return;
    }
    // Forzar nuevo trigger usando timestamp invisible al final del prompt
    setInitialPrompt(`${topic.prompt}\u200B${Date.now()}`);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-3">
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
        <span className="text-xs text-muted-foreground">YUSIOP Help</span>
      </div>

      {/* Header */}
      <div className="blob-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl vapor-bg flex items-center justify-center shrink-0">
            <HelpCircle className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="eyebrow mb-1">Soporte</p>
            <h1 className="font-display display-xl text-2xl sm:text-3xl">Ayuda y Soporte</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Resuelve dudas sobre tarjetas, descargas y tu cuenta.
            </p>
          </div>
        </div>
      </div>

      {/* Botones rápidos */}
      <div>
        <h2 className="font-display text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          Temas rápidos
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {QUICK_TOPICS.map((topic) => (
            <button
              key={topic.key}
              type="button"
              onClick={() => handleQuick(topic)}
              className="text-left rounded-2xl border border-border/60 bg-card hover:bg-accent hover:border-primary/40 transition-colors p-3 text-sm font-medium"
            >
              {topic.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat IA */}
      <div>
        <h2 className="font-display text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <MessageCircle className="h-4 w-4" /> Chat de soporte
        </h2>
        <SupportChat
          initialPrompt={initialPrompt}
          onEscalate={({ category, lastMessage }) => {
            setEscalateCategory(category ?? 'other');
            setEscalateDescription(lastMessage ?? '');
            setEscalateOpen(true);
          }}
        />
      </div>

      {/* Mis tickets */}
      {myTickets.length > 0 && (
        <div>
          <h2 className="font-display text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Ticket className="h-4 w-4" /> Mis tickets
          </h2>
          <div className="space-y-2">
            {myTickets.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-border/60 bg-card p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{t.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: es })}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[t.status]}>{STATUS_LABEL[t.status]}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQ */}
      <div>
        <h2 className="font-display text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          Preguntas frecuentes
        </h2>
        <div className="blob-card px-4">
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((item, idx) => (
              <AccordionItem key={idx} value={`faq-${idx}`} className="border-border/40">
                <AccordionTrigger className="text-sm text-left hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      <EscalateTicketDialog
        open={escalateOpen}
        onOpenChange={setEscalateOpen}
        defaultCategory={escalateCategory}
        defaultDescription={escalateDescription}
        onCreated={loadTickets}
      />
    </div>
  );
}
