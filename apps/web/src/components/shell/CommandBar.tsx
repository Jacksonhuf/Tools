import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Moon, Search, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function CommandBar({
  onOpenCommandPalette,
}: {
  onOpenCommandPalette: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md">
      <button
        type="button"
        data-testid="command-bar-search"
        onClick={onOpenCommandPalette}
        className={cn(
          "flex h-8 flex-1 max-w-md items-center gap-2 rounded-md border border-border/60 bg-surface-2 px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
        )}
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 truncate">{t("commandPalettePlaceholder")}</span>
        <kbd className="hidden rounded border border-border/80 bg-surface-1 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-1.5">
        <div
          className="hidden items-center gap-1.5 rounded-md border border-border/50 bg-surface-2 px-2 py-1 text-xs text-muted-foreground sm:flex"
          data-testid="agent-status-idle"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          {t("agentStatusIdle")}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggleTheme}
          aria-label={t("toggleTheme")}
        >
          {theme === "dark" || resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        <Select
          value={i18n.language}
          onValueChange={(value) => void i18n.changeLanguage(value)}
        >
          <SelectTrigger className="h-8 w-[120px] border-border/60 bg-surface-2 text-xs" aria-label="language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="zh-CN">中文</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es-MX">Español (MX)</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="user"
        >
          <User className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
