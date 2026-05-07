-- ============================================================
-- Claw Reach AI: Core Database Schema Migration
-- Platform: Supabase (PostgreSQL)
-- Version: 001
-- Description: Create normalized 3-table architecture for
--              campaigns, influencers, and outreach tracking
-- ============================================================

-- ============================================================
-- 1. CAMPAIGNS TABLE
-- ============================================================
-- Stores campaign metadata and orchestration state
-- Primary entity: Brand campaign configuration

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Campaign Context: The 4 Pillars (gathered by Bouncer API)
    brand_context TEXT NOT NULL,
    target_audience TEXT NOT NULL,
    creator_profile TEXT NOT NULL,
    campaign_goal TEXT NOT NULL,
    
    -- Campaign Status: Workflow State Machine
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'ready_for_openclaw', 'processing', 'completed')
    ),
    
    -- Audit & Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Soft Delete Support (optional)
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Index for status filtering and time-based queries
CREATE INDEX IF NOT EXISTS idx_campaigns_status 
    ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at 
    ON campaigns(created_at DESC);


-- ============================================================
-- 2. INFLUENCERS TABLE
-- ============================================================
-- Global master list of influencers (immutable reference data)
-- Supports UPSERT operations via channel_id UNIQUE constraint
-- Sourced from OpenClaw worker background service

CREATE TABLE IF NOT EXISTS influencers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- YouTube Channel Identifier (natural key for deduplication)
    channel_id VARCHAR(255) NOT NULL UNIQUE,
    channel_name VARCHAR(500) NOT NULL,
    
    -- Channel Metrics
    subscriber_count INTEGER NOT NULL DEFAULT 0,
    
    -- Contact Information
    extracted_email VARCHAR(255),
    
    -- Extended Metadata (flexible JSONB structure)
    -- Examples: { "topics": [...], "engagement_rate": 0.05, "verified": true }
    sponsors JSONB,
    
    -- Audit & Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Index for email lookups and channel_id (already UNIQUE)
CREATE INDEX IF NOT EXISTS idx_influencers_channel_id 
    ON influencers(channel_id);
CREATE INDEX IF NOT EXISTS idx_influencers_extracted_email 
    ON influencers(extracted_email)
    WHERE extracted_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_influencers_subscriber_count 
    ON influencers(subscriber_count DESC);


-- ============================================================
-- 3. OUTREACH_LOGS TABLE (Junction/Bridge Table)
-- ============================================================
-- Maps influencers to campaigns with outreach state tracking
-- Implements Compound Unique Constraint to prevent duplicates
-- Webhook endpoint writes INSERT events here; frontend listens via WebSocket

CREATE TABLE IF NOT EXISTS outreach_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys (with CASCADE delete for referential integrity)
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
    
    -- Compound Unique Constraint: Only ONE outreach per (campaign, influencer) pair
    UNIQUE(campaign_id, influencer_id),
    
    -- Outreach Status & Tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'sent', 'engaged', 'rejected', 'no_contact')
    ),
    
    -- Contact Method & Details
    contact_method VARCHAR(100),
    message_preview TEXT,
    
    -- Engagement Metrics
    opened BOOLEAN DEFAULT FALSE,
    clicked BOOLEAN DEFAULT FALSE,
    responded BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    sent_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_outreach_logs_campaign_id 
    ON outreach_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_outreach_logs_influencer_id 
    ON outreach_logs(influencer_id);
CREATE INDEX IF NOT EXISTS idx_outreach_logs_status 
    ON outreach_logs(status);
CREATE INDEX IF NOT EXISTS idx_outreach_logs_created_at 
    ON outreach_logs(created_at DESC);

-- Composite index for campaign-status filtering
CREATE INDEX IF NOT EXISTS idx_outreach_logs_campaign_status 
    ON outreach_logs(campaign_id, status);


-- ============================================================
-- ENUM TYPES (Optional: Explicit PostgreSQL Enums)
-- ============================================================
-- Uncomment below for stricter type enforcement (recommended)
-- Run these BEFORE table creation if using explicit enums

/*
CREATE TYPE campaign_status AS ENUM 
    ('draft', 'ready_for_openclaw', 'processing', 'completed');

CREATE TYPE outreach_status AS ENUM 
    ('pending', 'sent', 'engaged', 'rejected', 'no_contact');

-- Then update table DDL to use:
-- status campaign_status NOT NULL DEFAULT 'draft'
-- status outreach_status NOT NULL DEFAULT 'pending'
*/

-- ============================================================
-- REALTIME SUBSCRIPTIONS (Supabase Configuration)
-- ============================================================
-- Enable PostgreSQL WAL (Write-Ahead Logging) for realtime
-- This allows the frontend to listen to INSERT events on outreach_logs

/*
-- Execute in Supabase Dashboard or via CLI:
ALTER TABLE campaigns REPLICA IDENTITY FULL;
ALTER TABLE influencers REPLICA IDENTITY FULL;
ALTER TABLE outreach_logs REPLICA IDENTITY FULL;

-- Enable realtime for frontend WebSocket subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE outreach_logs;
*/

-- ============================================================
-- SAMPLE DATA (Optional: For Development)
-- ============================================================
/*
-- INSERT INTO campaigns (brand_context, target_audience, creator_profile, campaign_goal) 
-- VALUES 
-- ('TechCorp AI Tools', 'Software developers', 'Mid-tier YouTube creators', 'Launch product awareness'),
-- ('FitLife Supplements', 'Fitness enthusiasts', 'Fitness influencers', 'Increase brand credibility');

-- INSERT INTO influencers (channel_id, channel_name, subscriber_count, extracted_email, sponsors)
-- VALUES 
-- ('UC1234567890', 'TechReviews Daily', 150000, 'contact@techreviewsdaily.com', '{"topics": ["AI", "software"], "verified": true}'),
-- ('UC0987654321', 'FitLife Coach', 500000, 'pr@fitlifecoach.com', '{"topics": ["fitness", "wellness"], "engagement_rate": 0.08}');
*/

-- ============================================================
-- MIGRATION NOTES
-- ============================================================
-- 1. The channels unique constraint on influencers allows UPSERT:
--    INSERT INTO influencers (...) 
--    ON CONFLICT(channel_id) DO UPDATE SET ...
--
-- 2. The compound unique on outreach_logs prevents duplicate outreach:
--    Only one outreach record per campaign-influencer pair
--
-- 3. CASCADE delete ensures data integrity:
--    Delete a campaign → all outreach_logs referencing it are deleted
--    Delete an influencer → all outreach_logs referencing it are deleted
--
-- 4. Enable Supabase Realtime in Dashboard:
--    Settings > Realtime > Enable for outreach_logs table
--    Frontend subscribes: supabase.from('outreach_logs').on('INSERT', ...)
