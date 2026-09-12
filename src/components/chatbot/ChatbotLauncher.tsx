import { MessageSquareText, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const ChatbotLauncher = () => {
  return (
    <Button
      asChild
      className="fixed bottom-5 right-5 z-50 h-12 rounded-full px-5 shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground border border-primary/20"
      aria-label="Open CUK AI Assistant"
    >
      <Link to="/assistant" className="flex items-center gap-2">
        <div className="relative flex items-center justify-center">
          <MessageSquareText className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
        </div>
        <span className="font-semibold text-sm tracking-wide">NeMoX AI</span>
        <Sparkles className="h-3.5 w-3.5 opacity-80" />
      </Link>
    </Button>
  );
};

