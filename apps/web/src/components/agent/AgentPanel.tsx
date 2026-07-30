import { useTranslation } from "react-i18next";
import { Bot } from "lucide-react";
import { CopilotChatPanel } from "@/components/CopilotChatPanel";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgent } from "./AgentContext";
import { ApprovalInbox } from "./ApprovalInbox";
import { TaskTimeline } from "./TaskTimeline";

export function AgentPanel() {
  const { t } = useTranslation();
  const {
    panelOpen,
    setPanelOpen,
    sessionId,
    chatMessages,
    chatInput,
    setChatInput,
    sendChat,
    exportSession,
    auditItems,
    pendingBatches,
    navigateToAdjustments,
    isSending,
  } = useAgent();

  return (
    <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-lg"
        data-testid="agent-panel"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            {t("agentPanelTitle")}
          </SheetTitle>
          <SheetDescription>{t("agentPanelHint")}</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="chat" className="flex min-h-0 flex-1 flex-col px-5 pb-5">
          <TabsList className="grid w-full grid-cols-3 bg-surface-3">
            <TabsTrigger value="chat" data-testid="agent-panel-tab-chat">
              {t("agentPanelChat")}
            </TabsTrigger>
            <TabsTrigger value="timeline" data-testid="agent-panel-tab-timeline">
              {t("agentPanelTimeline")}
            </TabsTrigger>
            <TabsTrigger
              value="approvals"
              data-testid="agent-panel-tab-approvals"
            >
              {t("agentPanelApprovals")}
              {pendingBatches.length > 0 && (
                <span className="ml-1.5 rounded-full bg-warning/20 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                  {pendingBatches.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-4 min-h-0 flex-1 data-[state=inactive]:hidden">
            <CopilotChatPanel
              compact
              title={t("copilotChatTitle")}
              messages={chatMessages}
              chatInput={chatInput}
              placeholder={t("copilotChatPlaceholder")}
              sendLabel={isSending ? t("agentPanelSending") : t("copilotChatSend")}
              exportLabel={t("copilotSessionExportCsv")}
              sessionId={sessionId}
              onInputChange={setChatInput}
              onSend={() => void sendChat()}
              onExport={() => void exportSession()}
            />
          </TabsContent>

          <TabsContent
            value="timeline"
            className="mt-4 min-h-0 flex-1 data-[state=inactive]:hidden"
          >
            <TaskTimeline items={auditItems} />
          </TabsContent>

          <TabsContent
            value="approvals"
            className="mt-4 min-h-0 flex-1 data-[state=inactive]:hidden"
          >
            <ApprovalInbox
              batches={pendingBatches}
              onViewAll={navigateToAdjustments}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
