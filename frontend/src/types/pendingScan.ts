/**
 * Types for the async scan pipeline (Story 18-13a).
 *
 * Firestore path: pending_scans/{scanId} (flat collection, userId as field)
 * Admin SDK creates/updates docs; client can only read/delete own.
 */

import type { Timestamp } from 'firebase/firestore'

/** Status of a pending scan document */
export type FirestoreScanStatus = 'processing' | 'completed' | 'failed'

/** Gemini analysis result stored in pending scan doc on success */
export interface FirestoreScanResult {
  transactionId: string
  merchant: string
  date: string
  total: number
  category: string
  items: Array<{
    name: string
    totalPrice: number
    unitPrice?: number
    qty?: number
    category?: string
    subcategory?: string
  }>
  currency?: string
  country?: string
  city?: string
  imageUrls: string[]
  thumbnailUrl: string
  promptVersion: string
  merchantSource: 'scan'
  receiptType?: string
  confidence?: number
}

/** Firestore document shape for pending_scans/{scanId} */
export interface FirestorePendingScan {
  scanId: string
  userId: string
  status: FirestoreScanStatus
  result?: FirestoreScanResult
  error?: string
  createdAt: Timestamp
  imageUrls: string[]
  processingDeadline: Timestamp
  creditDeducted: boolean
  receiptType?: string
}
