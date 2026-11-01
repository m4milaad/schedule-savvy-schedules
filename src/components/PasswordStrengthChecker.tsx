import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthCheckerProps {
  password: string;
}

// Same rules the sign-up and reset forms enforce on submit.
const RULES = [
  { label: '8+ characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase (A–Z)', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase (a–z)', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number (0–9)', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Symbol (! @ # $ …)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const LEVELS = [
  { word: 'Weak', bar: 'bg-red-500' },
  { word: 'Weak', bar: 'bg-red-500' },
  { word: 'Fair', bar: 'bg-amber-500' },
  { word: 'Good', bar: 'bg-yellow-400' },
  { word: 'Strong', bar: 'bg-emerald-500' },
];

/** Strength meter + checklist. Neutral until the user types; colours inherit the surrounding text. */
export const PasswordStrengthChecker: React.FC<PasswordStrengthCheckerProps> = ({ password }) => {
  const results = RULES.map((r) => r.test(password));
  const met = results.filter(Boolean).length;
  const level = LEVELS[Math.max(met - 1, 0)];
  const typed = password.length > 0;

  return (
    <div className="mt-2 flex flex-col gap-2.5 text-xs">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden>
          {RULES.map((_, i) => (
            <span
              key={i}
              className={cn('h-1 flex-1 rounded-full bg-current opacity-15 transition-colors', typed && i < met && cn(level.bar, 'opacity-100'))}
            />
          ))}
        </div>
        <span aria-live="polite" className={cn('w-12 text-right font-medium', !typed && 'opacity-50')}>
          {typed ? level.word : 'Strength'}
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5" aria-label="Password requirements">
        {RULES.map((rule, i) => (
          <li
            key={rule.label}
            className={cn('flex items-center gap-1.5 transition-colors', results[i] ? 'text-emerald-500' : 'opacity-60')}
          >
            {results[i] ? (
              <Check className="size-3.5 shrink-0" />
            ) : (
              <span className="size-3.5 shrink-0 rounded-full border border-current" aria-hidden />
            )}
            <span>
              {rule.label}
              <span className="sr-only">{results[i] ? ' — done' : ' — needed'}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
