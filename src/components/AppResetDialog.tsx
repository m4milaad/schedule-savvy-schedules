import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, RefreshCw, Trash2, Database, Cookie, HardDrive, Server } from 'lucide-react';
import { resetApp } from '@/utils/appReset';
import { useToast } from '@/components/ui/use-toast';

interface AppResetDialogProps {
  /**
   * Custom trigger button. If not provided, a default button will be used.
   */
  trigger?: React.ReactNode;
  /**
   * Variant of the default trigger button
   */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  /**
   * Size of the default trigger button
   */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /**
   * Custom button text for the default trigger
   */
  buttonText?: string;
  /**
   * Show icon in the default trigger button
   */
  showIcon?: boolean;
}

export function AppResetDialog({
  trigger,
  variant = 'outline',
  size = 'default',
  buttonText = 'Reset App',
  showIcon = true,
}: AppResetDialogProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const { toast } = useToast();

  const handleReset = async () => {
    setIsResetting(true);
    setProgress(0);
    
    const progressSteps = [
      'Clearing cache storage...',
      'Unregistering service workers...',
      'Clearing localStorage...',
      'Clearing sessionStorage...',
      'Clearing IndexedDB...',
      'Clearing cookies...',
      'Finalizing reset...',
    ];

    let currentStep = 0;
    const progressInterval = setInterval(() => {
      if (currentStep < progressSteps.length) {
        setProgressMessage(progressSteps[currentStep]);
        setProgress(((currentStep + 1) / progressSteps.length) * 100);
        currentStep++;
      }
    }, 300);

    try {
      await resetApp({
        reloadAfterReset: true,
        onProgress: (message) => {
          console.log(message);
        },
        onError: (error) => {
          console.error('Reset error:', error);
        },
      });
    } catch (error) {
      clearInterval(progressInterval);
      setIsResetting(false);
      toast({
        title: 'Reset Failed',
        description: error instanceof Error ? error.message : 'An error occurred during reset',
        variant: 'destructive',
      });
    }
  };

  const defaultTrigger = (
    <Button variant={variant} size={size}>
      {showIcon && <Trash2 className="mr-2 h-4 w-4" />}
      {buttonText}
    </Button>
  );

  const dataItems = [
    { icon: HardDrive, label: 'Cached files' },
    { icon: Server, label: 'Service workers' },
    { icon: Database, label: 'Local & session storage' },
    { icon: Database, label: 'IndexedDB databases' },
    { icon: Cookie, label: 'Browser cookies' },
  ];

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger || defaultTrigger}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            Reset Application Data
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-4 text-left">
            {!isResetting ? (
              <>
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="text-sm leading-relaxed text-foreground">
                    This will clear all cached data and reset the application to fix offline or loading issues.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">
                    The following will be cleared:
                  </p>
                  <div className="grid gap-2">
                    {dataItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 rounded-md border bg-card p-3 transition-colors hover:bg-accent"
                      >
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-card-foreground">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border-2 border-destructive/20 bg-destructive/5 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0 text-destructive" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        Important Notice
                      </p>
                      <p className="text-sm text-muted-foreground">
                        You will be logged out and the page will reload automatically.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-6 py-6">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-primary/20"></div>
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary-foreground" />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{Math.round(progress)}%</span>
                      <span>Complete</span>
                    </div>
                  </div>
                  
                  <div className="rounded-lg border bg-muted p-3 text-center">
                    <p className="text-sm font-medium text-foreground">
                      {progressMessage}
                    </p>
                  </div>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  Please wait, do not close this window...
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {!isResetting && (
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleReset();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset & Reload
            </AlertDialogAction>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
