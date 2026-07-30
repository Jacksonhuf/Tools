import type { CopilotChatMessage } from "../api/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function CopilotChatPanel({
  title,
  messages,
  chatInput,
  placeholder,
  sendLabel,
  exportLabel,
  sessionId,
  compact = false,
  onInputChange,
  onSend,
  onExport,
}: {
  title: string;
  messages: CopilotChatMessage[];
  chatInput: string;
  placeholder: string;
  sendLabel: string;
  exportLabel: string;
  sessionId: string | null;
  compact?: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onExport: () => void;
}) {
  const chatArea = (
    <>
      <ScrollArea
        className={cn(
          "rounded-lg border bg-muted/20 p-4",
          compact ? "h-[calc(100vh-22rem)]" : "h-80"
        )}
      >
          <div className="flex flex-col gap-3" data-testid="copilot-chat">
            {messages.map((m, idx) => (
              <div
                key={`${m.created_at}-${idx}`}
                className={cn(
                  "max-w-[85%] rounded-lg px-4 py-2 text-sm",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "mr-auto border bg-card"
                )}
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                  {m.role === "user" ? "You" : "Copilot"}
                </p>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
          </div>
      </ScrollArea>
      <Textarea
        rows={compact ? 3 : 2}
        value={chatInput}
        placeholder={placeholder}
        onChange={(e) => onInputChange(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={!sessionId} onClick={onSend}>
          {sendLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!sessionId}
          data-testid="copilot-session-export"
          onClick={onExport}
        >
          {exportLabel}
        </Button>
      </div>
    </>
  );

  if (compact) {
    return (
      <div className="space-y-4" data-testid="copilot-chat-panel">
        <p className="text-sm font-medium">{title}</p>
        {chatArea}
      </div>
    );
  }

  return (
    <Card data-testid="copilot-chat-panel">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{chatArea}</CardContent>
    </Card>
  );
}
