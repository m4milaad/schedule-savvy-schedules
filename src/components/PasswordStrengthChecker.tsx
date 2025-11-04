import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthCheckerProps {
  password: string;
}

export const PasswordStrengthChecker: React.FC<PasswordStrengthCheckerProps> = ({ password }) => {
  const checks = [
    {
      label: 'At least 8 characters long',
      test: password.length >= 8,
    },
    {
      label: 'Contains at least one uppercase letter',
      test: /[A-Z]/.test(password),
    },
    {
      label: 'Contains at least one lowercase letter',
      test: /[a-z]/.test(password),
    },
    {
      label: 'Contains at least one number',
      test: /[0-9]/.test(password),
    },
    {
      label: 'Contains at least one special character (@, #, $, %, etc.)',
      test: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const allChecksPassed = checks.every(check => check.test);

  return (
    <div className="space-y-2 mt-2">
      {checks.map((check, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          {check.test ? (
            <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
          ) : (
            <X className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          )}
          <span className={check.test ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
            {check.label}
          </span>
        </div>
      ))}
      {allChecksPassed && password.length > 0 && (
        <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400 mt-3 pt-2 border-t border-green-200 dark:border-green-800">
          <Check className="w-4 h-4" />
          <span>✅ Strong password!</span>
        </div>
      )}
    </div>
  );
};
