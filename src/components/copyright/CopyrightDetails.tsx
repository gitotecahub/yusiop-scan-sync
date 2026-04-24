import { ShieldAlert, ShieldX, ShieldCheck, ExternalLink } from 'lucide-react';
import type { CopyrightStatus } from './CopyrightBadge';

export interface CopyrightMatch {
  source: 'internal_duplicate' | 'musicbrainz' | 'acoustid';
  confidence: number;
  title?: string;
  artist?: string;
  album?: string;
  url?: string;
  reason?: string;
}

interface Props {
  status: CopyrightStatus;
  score?: number | null;
  matches?: CopyrightMatch[] | null;
}

const sourceLabel = (s: CopyrightMatch['source']) => {
  switch (s) {
    case 'internal_duplicate':
      return 'Duplicado en Yusiop';
    case 'musicbrainz':
      return 'MusicBrainz';
    case 'acoustid':
      return 'AcoustID';
  }
};

const CopyrightDetails = ({ status, score, matches }: Props) => {
  if (status === 'pending' || status === 'analyzing') return null;

  const tone =
    status === 'blocked'
      ? 'border-destructive/30 bg-destructive/5'
      : status === 'review'
        ? 'border-amber-500/30 bg-amber-500/5'
        : status === 'clean'
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-muted bg-muted/30';

  const Icon =
    status === 'blocked' ? ShieldX : status === 'review' ? ShieldAlert : ShieldCheck;

  const titleText =
    status === 'blocked'
      ? 'Detección de copyright (envío bloqueado)'
      : status === 'review'
        ? 'Posibles coincidencias (requiere revisión manual)'
        : status === 'clean'
          ? 'Análisis de copyright superado'
          : 'Análisis de copyright';

  const iconColor =
    status === 'blocked'
      ? 'text-destructive'
      : status === 'review'
        ? 'text-amber-600 dark:text-amber-400'
        : status === 'clean'
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-muted-foreground';

  return (
    <div className={`mt-3 rounded-md border p-3 ${tone}`}>
      <div className="flex items-start gap-2">
        <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
        <div className="text-sm flex-1 min-w-0">
          <p className="font-semibold">
            {titleText}
            {typeof score === 'number' && score > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                · puntuación {score}%
              </span>
            )}
          </p>
          {status === 'clean' && (
            <p className="text-foreground/80 mt-1 text-xs">
              No se han detectado coincidencias significativas con bases de datos públicas
              (MusicBrainz, AcoustID) ni duplicados internos.
            </p>
          )}
          {matches && matches.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {matches.slice(0, 5).map((m, i) => (
                <li key={i} className="text-xs">
                  <span className="font-medium">{sourceLabel(m.source)}</span>{' '}
                  <span className="text-muted-foreground">·</span>{' '}
                  <span className="font-medium">{m.confidence}%</span>
                  {m.title && (
                    <>
                      {' '}
                      <span className="text-muted-foreground">·</span>{' '}
                      <span>"{m.title}"</span>
                    </>
                  )}
                  {m.artist && (
                    <>
                      {' '}
                      <span className="text-muted-foreground">de</span>{' '}
                      <span>{m.artist}</span>
                    </>
                  )}
                  {m.album && (
                    <span className="text-muted-foreground"> ({m.album})</span>
                  )}
                  {m.url && (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1 inline-flex items-center text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {m.reason && (
                    <p className="text-muted-foreground mt-0.5">{m.reason}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default CopyrightDetails;
