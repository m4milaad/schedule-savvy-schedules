import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { resetApp } from '@/utils/appReset';

interface AppResetButtonProps {
  /**
   * Button variant
   */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  /**
   * Button size
   */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /**
   * Custom button text
   */
  text?: string;
  /**
   * Show icon
   */
  showIcon?: boolean;
  /**
   * Show confirmation dialog (uses browser's native confirm)
   */
  showConfirmation?: boolean;
  /**
   * Custom CSS classes
   */
  className?: string;
}

/**
 * Simple button component that resets the app without a custom dialog.
 * Uses browser's native confirmation dialog.
 */
export function AppResetButton({
  variant = 'outline',
  size = 'default',
  text = 'Clear App Data',
  showIcon = true,
  showConfirmation = true,
  className,
}: AppResetButtonProps) {
  const [isResetting, setIsResetting] = useState(false);

  const handleClick = async () => {
    if (showConfirmation) {
      const confirmed = window.confirm(
        'This will clear all cached data, log you out, and reload the page.\n\n' +
        'Are you sure you want to continue?'
      );
      
      if (!confirmed) {
        return;
      }
    }

    setIsResetting(true);

    try {
      await resetApp({
        reloadAfterReset: true,
      });
    } catch (error) {
      setIsResetting(false);
      alert('Failed to reset app: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isResetting}
      className={className}
    >
      {isResetting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Resetting...
        </>
      ) : (
        <>
          {showIcon && <Trash2 className="mr-2 h-4 w-4" />}
          {text}
        </>
      )}
    </Button>
  );
}
