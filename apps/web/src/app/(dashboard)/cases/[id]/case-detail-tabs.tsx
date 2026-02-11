'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CaseDetailsTab } from '@/components/cases/case-details-tab';
import { CaseStatusActions } from '@/components/cases/case-status-actions';
import { CaseHistoryTab } from '@/components/cases/case-history-tab';
import { DocumentsTab } from '@/components/documents/documents-tab';
import { ChatTab } from '@/components/chat/chat-tab';
import { InvoiceTab } from '@/components/cases/invoice-tab';
import { useAuthStore } from '@/stores/auth-store';

interface CaseDetailTabsProps {
  caseData: any;
}

export function CaseDetailTabs({ caseData }: CaseDetailTabsProps) {
  const { user } = useAuthStore();
  const isStaff = user?.userType === 'STAFF';

  return (
    <div className="space-y-4">
      {isStaff && <CaseStatusActions caseData={caseData} />}

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          {isStaff && <TabsTrigger value="invoice">Invoice</TabsTrigger>}
        </TabsList>

        <TabsContent value="details">
          <CaseDetailsTab caseData={caseData} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab caseId={caseData.id} isStaff={isStaff} />
        </TabsContent>

        <TabsContent value="chat">
          <ChatTab caseId={caseData.id} />
        </TabsContent>

        <TabsContent value="history">
          <CaseHistoryTab caseData={caseData} />
        </TabsContent>

        {isStaff && (
          <TabsContent value="invoice">
            <InvoiceTab caseId={caseData.id} organizationId={caseData.orgId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
