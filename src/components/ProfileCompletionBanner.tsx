import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface ProfileCompletionBannerProps {
  missingFields: string[];
  onComplete: () => void;
  onDismiss: () => void;
}

export const ProfileCompletionBanner: React.FC<ProfileCompletionBannerProps> = ({
  missingFields,
  onComplete,
  onDismiss
}) => {
  if (missingFields.length === 0) return null;

  return (
    <Card className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800 animate-fade-in">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 animate-pulse" />
            <div>
              <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                Complete Your Profile
              </h3>
              <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                Please complete your profile to enroll in courses and access all features.
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {missingFields.map((field, index) => (
                  <Badge 
                    key={field} 
                    variant="outline" 
                    className="bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-800/30 dark:text-orange-200 dark:border-orange-600 animate-scale-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {field}
                  </Badge>
                ))}
              </div>
              <Button 
                onClick={onComplete}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Complete Profile
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};