/**
 * TypeScript Interfaces for Claw Reach AI Database Schema
 * Corresponds to Supabase PostgreSQL tables
 * Auto-generated from schema: database/migrations/001_create_core_tables.sql
 */

// ============================================================
// ENUM TYPES
// ============================================================

export type CampaignStatus = 'draft' | 'ready_for_openclaw' | 'processing' | 'completed';

export type OutreachStatus = 'pending' | 'sent' | 'engaged' | 'rejected' | 'no_contact';

export type ContactMethod = 'email' | 'youtube_dm' | 'instagram_dm' | 'tiktok_dm' | 'other';


// ============================================================
// 1. CAMPAIGNS TABLE INTERFACE
// ============================================================
/**
 * Campaigns table: Stores campaign metadata and orchestration state
 * Primary entity for brand campaign configuration
 */
export interface Campaign {
  // Primary Key
  id: string; // UUID

  // The 4 Pillars (extracted by Bouncer API)
  brand_context: string;
  target_audience: string;
  creator_profile: string;
  campaign_goal: string;

  // Status Workflow
  status: CampaignStatus;

  // Audit Timestamps
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
  deleted_at: string | null; // Soft delete support
}

/**
 * Insert/Create payload for Campaign
 * Omits auto-generated fields
 */
export interface CampaignInsert {
  brand_context: string;
  target_audience: string;
  creator_profile: string;
  campaign_goal: string;
  status?: CampaignStatus; // Optional, defaults to 'draft'
}

/**
 * Update payload for Campaign
 * All fields are optional for PATCH operations
 */
export interface CampaignUpdate {
  brand_context?: string;
  target_audience?: string;
  creator_profile?: string;
  campaign_goal?: string;
  status?: CampaignStatus;
  deleted_at?: string | null;
}


// ============================================================
// 2. INFLUENCERS TABLE INTERFACE
// ============================================================
/**
 * Influencers table: Global master list of influencers
 * Supports UPSERT operations via unique channel_id constraint
 * Sourced from OpenClaw worker background service
 */
export interface Influencer {
  // Primary Key
  id: string; // UUID

  // YouTube Channel Identifier (natural key for deduplication)
  channel_id: string; // UNIQUE constraint for UPSERT
  channel_name: string;

  // Channel Metrics
  subscriber_count: number;

  // Contact Information
  extracted_email: string | null;

  // Extended Metadata (flexible JSONB structure)
  // Example: { "topics": ["AI", "software"], "engagement_rate": 0.05, "verified": true }
  sponsors: Record<string, any> | null;

  // Audit Timestamps
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
  deleted_at: string | null; // Soft delete support
}

/**
 * Insert/Create payload for Influencer
 * Omits auto-generated fields
 */
export interface InfluencerInsert {
  channel_id: string;
  channel_name: string;
  subscriber_count?: number; // Optional, defaults to 0
  extracted_email?: string | null;
  sponsors?: Record<string, any> | null;
}

/**
 * Update payload for Influencer
 * All fields are optional for PATCH operations
 */
export interface InfluencerUpdate {
  channel_id?: string;
  channel_name?: string;
  subscriber_count?: number;
  extracted_email?: string | null;
  sponsors?: Record<string, any> | null;
  deleted_at?: string | null;
}

/**
 * UPSERT payload for Influencer
 * Used for the "ON CONFLICT(channel_id) DO UPDATE" operation
 * Typically you'd pass both insert and update data
 */
export interface InfluencerUpsert extends InfluencerInsert {
  // Additional update fields if needed
}


// ============================================================
// 3. OUTREACH_LOGS TABLE INTERFACE
// ============================================================
/**
 * OutreachLogs table: Junction/Bridge table mapping influencers to campaigns
 * Implements compound unique constraint on (campaign_id, influencer_id)
 * Prevents duplicate outreach records for same campaign-influencer pair
 * Webhook endpoint writes INSERT events; frontend listens via WebSocket
 */
export interface OutreachLog {
  // Primary Key
  id: string; // UUID

  // Foreign Keys
  campaign_id: string; // UUID, references campaigns(id)
  influencer_id: string; // UUID, references influencers(id)

  // Compound Unique Constraint: (campaign_id, influencer_id)
  // Only ONE outreach record per campaign-influencer pair

  // Outreach Status & Tracking
  status: OutreachStatus;

  // Contact Method & Details
  contact_method: ContactMethod | null;
  message_preview: string | null;

  // Engagement Metrics
  opened: boolean;
  clicked: boolean;
  responded: boolean;

  // Timestamps
  sent_at: string | null; // ISO 8601 timestamp
  responded_at: string | null; // ISO 8601 timestamp
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

/**
 * Insert/Create payload for OutreachLog
 * Omits auto-generated fields
 */
export interface OutreachLogInsert {
  campaign_id: string;
  influencer_id: string;
  status?: OutreachStatus; // Optional, defaults to 'pending'
  contact_method?: ContactMethod | null;
  message_preview?: string | null;
  opened?: boolean;
  clicked?: boolean;
  responded?: boolean;
  sent_at?: string | null;
  responded_at?: string | null;
}

/**
 * Update payload for OutreachLog
 * All fields are optional for PATCH operations
 */
export interface OutreachLogUpdate {
  status?: OutreachStatus;
  contact_method?: ContactMethod | null;
  message_preview?: string | null;
  opened?: boolean;
  clicked?: boolean;
  responded?: boolean;
  sent_at?: string | null;
  responded_at?: string | null;
}


// ============================================================
// COMBINED RESPONSE TYPES (with Relations)
// ============================================================

/**
 * OutreachLog with campaign and influencer details
 * Useful for frontend display after JOIN operations
 */
export interface OutreachLogWithDetails extends OutreachLog {
  campaign: Campaign;
  influencer: Influencer;
}

/**
 * Campaign with associated outreach logs and influencers
 * Useful for campaign dashboard view
 */
export interface CampaignWithOutreach extends Campaign {
  outreach_logs: OutreachLogWithDetails[];
}

/**
 * Influencer with associated campaigns
 * Useful for influencer profile or analytics view
 */
export interface InfluencerWithCampaigns extends Influencer {
  outreach_logs: OutreachLog[];
}


// ============================================================
// DATABASE UTILITIES & HELPER TYPES
// ============================================================

/**
 * Pagination parameters for list queries
 */
export interface PaginationParams {
  page?: number; // Default: 1
  limit?: number; // Default: 20, Max: 100
}

/**
 * Sorting parameters for list queries
 */
export interface SortParams {
  field: keyof Campaign | keyof Influencer | keyof OutreachLog;
  direction: 'asc' | 'desc';
}

/**
 * Generic response wrapper for API endpoints
 */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: 'success' | 'error';
}

/**
 * Realtime WebSocket event type
 * Matches Supabase Realtime payload structure
 */
export interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T | null;
  old: T | null;
  schema: string;
  table: string;
  commit_timestamp: string;
}

/**
 * Dashboard Statistics (denormalized for performance)
 */
export interface DashboardStats {
  totalCampaigns: number;
  totalInfluencers: number;
  totalOutreach: number;
  outreachByStatus: Record<OutreachStatus, number>;
  campaignsByStatus: Record<CampaignStatus, number>;
}
