import { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PasswordFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  showStrength?: boolean;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ showStrength = false, value, className, ...props }, ref) => {
    const [show, setShow] = useState(false);
    const pwd = String(value ?? '');

    const score = computeStrength(pwd);

    return (
      <div className="space-y-2">
        <div className="relative">
          <Input
            ref={ref}
            type={show ? 'text' : 'password'}
            value={value}
            className={cn('pr-12', className)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            tabIndex={-1}
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {showStrength && pwd.length > 0 && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors',
                    i < score.level ? score.colorClass : 'bg-muted'
                  )}
                />
              ))}
            </div>
            <p className={cn('text-[11px]', score.textClass)}>{score.label}</p>
          </div>
        )}
      </div>
    );
  }
);

PasswordField.displayName = 'PasswordField';

function computeStrength(pwd: string): {
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
  colorClass: string;
  textClass: string;
} {
  if (pwd.length === 0)
    return { level: 0, label: '', colorClass: 'bg-muted', textClass: 'text-muted-foreground' };
  if (pwd.length < 8)
    return {
      level: 1,
      label: `Demasiado corta (${pwd.length}/8)`,
      colorClass: 'bg-destructive',
      textClass: 'text-destructive',
    };

  let pts = 1;
  if (pwd.length >= 12) pts++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) pts++;
  if (/\d/.test(pwd)) pts++;
  if (/[^A-Za-z0-9]/.test(pwd)) pts++;

  if (pts <= 2)
    return { level: 2, label: 'Débil — añade números o símbolos', colorClass: 'bg-orange-500', textClass: 'text-orange-500' };
  if (pts === 3)
    return { level: 3, label: 'Buena', colorClass: 'bg-yellow-500', textClass: 'text-yellow-500' };
  return { level: 4, label: 'Excelente', colorClass: 'bg-green-500', textClass: 'text-green-500' };
}
