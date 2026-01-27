import { Moon, Sun, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/ThemeProvider"

export function ThemeToggle({ minimal = false }: { minimal?: boolean }) {
  const { setTheme, theme } = useTheme()

  const buttonClass = minimal 
    ? "h-9 w-9 border-border/40 hover:bg-muted/50 bg-transparent"
    : "relative overflow-hidden bg-white/20 border-white/30 backdrop-blur-sm hover:bg-white/30 group";

  const iconClass = minimal
    ? "h-4 w-4"
    : "h-[1.2rem] w-[1.2rem]";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className={buttonClass}
        >
          <Sun className={`${iconClass} rotate-0 scale-100 transition-all duration-500 dark:-rotate-90 dark:scale-0 ${!minimal && 'group-hover:rotate-12'}`} />
          <Moon className={`absolute ${iconClass} rotate-90 scale-0 transition-all duration-500 dark:rotate-0 dark:scale-100 ${!minimal && 'group-hover:-rotate-12'}`} />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="animate-in slide-in-from-top-2 duration-300"
      >
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className="cursor-pointer transition-colors duration-200 hover:bg-accent/80"
        >
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className="cursor-pointer transition-colors duration-200 hover:bg-accent/80"
        >
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className="cursor-pointer transition-colors duration-200 hover:bg-accent/80"
        >
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}