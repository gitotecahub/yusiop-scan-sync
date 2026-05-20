import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { AtSign, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MentionPick {
  user_id: string;
  username: string;
}

interface Props {
  value: string;
  pickedUserId?: string | null;
  onChange: (value: string, picked: MentionPick | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxLength?: number;
}

interface ProfileResult {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

/**
 * Input que permite etiquetar a un artista de Yusiop escribiendo "@".
 * Si el usuario escribe texto libre (sin @ o sin elegir resultado) se trata
 * como un nombre artístico normal y `pickedUserId` se devuelve como null.
 */
const ArtistMentionInput = ({
  value,
  pickedUserId,
  onChange,
  placeholder = 'Nombre artístico o @usuario',
  className,
  disabled,
  maxLength = 80,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  // Determina si el texto actual está en modo búsqueda (@xxx) y devuelve el query.
  const mentionQuery = (() => {
    if (!value.startsWith('@')) return null;
    return value.slice(1).trim();
  })();

  useEffect(() => {
    if (mentionQuery === null) {
      setOpen(false);
      setResults([]);
      return;
    }
    setOpen(true);
    setLoading(true);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const q = mentionQuery;
      let query = supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url')
        .order('username', { ascending: true })
        .limit(8);
      if (q.length > 0) query = query.ilike('username', `${q}%`);
      const { data } = await query;
      setResults((data as ProfileResult[]) ?? []);
      setHighlight(0);
      setLoading(false);
    }, 180);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [mentionQuery]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (p: ProfileResult) => {
    onChange(p.username, { user_id: p.user_id, username: p.username });
    setOpen(false);
  };

  const handleChange = (v: string) => {
    // Si había un pick y el usuario edita el texto, lo desvinculamos.
    if (pickedUserId && v !== value) {
      onChange(v, null);
    } else {
      onChange(v, pickedUserId ? { user_id: pickedUserId, username: value } : null);
    }
  };

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          autoComplete="off"
          onFocus={() => {
            if (value.startsWith('@')) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (!open || results.length === 0) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              pick(results[highlight]);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          className={cn(pickedUserId && 'pr-8')}
        />
        {pickedUserId && (
          <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
        )}
      </div>
      {!pickedUserId && !value.startsWith('@') && (
        <p className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1">
          <AtSign className="h-3 w-3" /> Escribe @ para etiquetar a un artista de Yusiop
        </p>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg overflow-hidden">
          {loading ? (
            <div className="px-3 py-3 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Buscando…
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground">
              Sin resultados. Puedes seguir escribiendo el nombre manualmente.
            </div>
          ) : (
            <ul className="max-h-60 overflow-y-auto">
              {results.map((r, i) => (
                <li key={r.user_id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(r);
                    }}
                    onMouseEnter={() => setHighlight(i)}
                    className={cn(
                      'w-full text-left px-3 py-2 flex items-center gap-2 text-sm',
                      i === highlight ? 'bg-muted' : 'hover:bg-muted/50',
                    )}
                  >
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold">
                        {r.username.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">@{r.username}</p>
                      {r.full_name && (
                        <p className="truncate text-[10px] text-muted-foreground">{r.full_name}</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default ArtistMentionInput;
