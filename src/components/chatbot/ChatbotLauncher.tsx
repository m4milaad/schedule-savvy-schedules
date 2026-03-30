import { MessageSquareText } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const ChatbotLauncher = () => {
  return (
    <Button
      asChild
      className="fixed bottom-5 right-5 z-50 h-11 rounded-full px-4 shadow-lg"
      aria-label="Open chatbot assistant"
    >
      <Link to="/assistant">
        <MessageSquareText className="mr-2 h-4 w-4" />
        Assistant
      </Link>
    </Button>
  );
};
