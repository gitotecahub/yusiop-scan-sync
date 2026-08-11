/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as giftReceived } from './gift-received.tsx'
import { template as songApproved } from './song-approved.tsx'
import { template as songRejected } from './song-rejected.tsx'
import { template as collaborationPublishedRegistered } from './collaboration-published-registered.tsx'
import { template as collaborationPublishedInvite } from './collaboration-published-invite.tsx'
import { template as collaborationSubmitted } from './collaboration-submitted.tsx'
import { template as claimSubmitted } from './claim-submitted.tsx'
import { template as claimApproved } from './claim-approved.tsx'
import { template as claimStatusUpdate } from './claim-status-update.tsx'
import { template as purchaseReceipt } from './purchase-receipt.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'gift-received': giftReceived,
  'song-approved': songApproved,
  'song-rejected': songRejected,
  'collaboration-published-registered': collaborationPublishedRegistered,
  'collaboration-published-invite': collaborationPublishedInvite,
  'collaboration-submitted': collaborationSubmitted,
  'claim-submitted': claimSubmitted,
  'claim-approved': claimApproved,
  'claim-status-update': claimStatusUpdate,
  'purchase-receipt': purchaseReceipt,
}

