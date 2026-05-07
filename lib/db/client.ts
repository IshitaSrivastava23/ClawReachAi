/**
 * Supabase Database Client Utilities
 * Handles CRUD operations and UPSERT logic for Claw Reach AI schema
 * 
 * Usage:
 *   const db = new SupabaseDatabaseClient(supabaseClient);
 *   await db.campaigns.create(campaignData);
 *   await db.influencers.upsert(influencerData);
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  Campaign,
  CampaignInsert,
  CampaignUpdate,
  CampaignStatus,
  Influencer,
  InfluencerInsert,
  InfluencerUpdate,
  OutreachLog,
  OutreachLogInsert,
  OutreachLogUpdate,
  OutreachLogWithDetails,
  ApiResponse,
  PaginationParams,
} from './database';

/**
 * Campaign Repository
 */
class CampaignRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new campaign
   */
  async create(data: CampaignInsert): Promise<Campaign> {
    const { data: campaign, error } = await this.supabase
      .from('campaigns')
      .insert([data])
      .select()
      .single();

    if (error) throw new Error(`Failed to create campaign: ${error.message}`);
    return campaign as Campaign;
  }

  /**
   * Retrieve campaign by ID
   */
  async getById(id: string): Promise<Campaign | null> {
    const { data, error } = await this.supabase
      .from('campaigns')
      .select()
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch campaign: ${error.message}`);
    }
    return (data as Campaign) || null;
  }

  /**
   * List all campaigns with pagination and filtering
   */
  async list(
    pagination?: PaginationParams,
    status?: CampaignStatus
  ): Promise<Campaign[]> {
    let query = this.supabase
      .from('campaigns')
      .select()
      .is('deleted_at', null);

    if (status) {
      query = query.eq('status', status);
    }

    // Apply pagination
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 20, 100);
    const offset = (page - 1) * limit;

    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw new Error(`Failed to list campaigns: ${error.message}`);
    return (data as Campaign[]) || [];
  }

  /**
   * Update campaign
   */
  async update(id: string, data: CampaignUpdate): Promise<Campaign> {
    const { data: campaign, error } = await this.supabase
      .from('campaigns')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update campaign: ${error.message}`);
    return campaign as Campaign;
  }

  /**
   * Update campaign status (convenience method)
   */
  async updateStatus(id: string, status: CampaignStatus): Promise<Campaign> {
    return this.update(id, { status });
  }

  /**
   * Soft delete campaign
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('campaigns')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(`Failed to delete campaign: ${error.message}`);
  }
}

/**
 * Influencer Repository
 */
class InfluencerRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new influencer
   */
  async create(data: InfluencerInsert): Promise<Influencer> {
    const { data: influencer, error } = await this.supabase
      .from('influencers')
      .insert([data])
      .select()
      .single();

    if (error) throw new Error(`Failed to create influencer: ${error.message}`);
    return influencer as Influencer;
  }

  /**
   * UPSERT influencer by channel_id
   * 
   * This is the key operation for OpenClaw worker integration.
   * If channel_id exists, update the record; otherwise, create new.
   * 
   * Usage:
   *   await db.influencers.upsert({
   *     channel_id: 'UC1234567890',
   *     channel_name: 'TechReviews Daily',
   *     subscriber_count: 150000,
   *     extracted_email: 'contact@tech.com',
   *     sponsors: { verified: true }
   *   });
   */
  async upsert(data: InfluencerInsert): Promise<Influencer> {
    const { data: influencer, error } = await this.supabase
      .from('influencers')
      .upsert([data], { onConflict: 'channel_id' })
      .select()
      .single();

    if (error) throw new Error(`Failed to upsert influencer: ${error.message}`);
    return influencer as Influencer;
  }

  /**
   * Bulk upsert influencers (batch operation)
   * Useful for OpenClaw worker syncing multiple influencers at once
   */
  async upsertBatch(data: InfluencerInsert[]): Promise<Influencer[]> {
    const { data: influencers, error } = await this.supabase
      .from('influencers')
      .upsert(data, { onConflict: 'channel_id' })
      .select();

    if (error) throw new Error(`Failed to upsert influencers: ${error.message}`);
    return (influencers as Influencer[]) || [];
  }

  /**
   * Retrieve influencer by ID
   */
  async getById(id: string): Promise<Influencer | null> {
    const { data, error } = await this.supabase
      .from('influencers')
      .select()
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch influencer: ${error.message}`);
    }
    return (data as Influencer) || null;
  }

  /**
   * Retrieve influencer by channel_id
   */
  async getByChannelId(channelId: string): Promise<Influencer | null> {
    const { data, error } = await this.supabase
      .from('influencers')
      .select()
      .eq('channel_id', channelId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch influencer: ${error.message}`);
    }
    return (data as Influencer) || null;
  }

  /**
   * List all influencers with pagination
   */
  async list(pagination?: PaginationParams): Promise<Influencer[]> {
    let query = this.supabase
      .from('influencers')
      .select()
      .is('deleted_at', null)
      .order('subscriber_count', { ascending: false });

    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 20, 100);
    const offset = (page - 1) * limit;

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw new Error(`Failed to list influencers: ${error.message}`);
    return (data as Influencer[]) || [];
  }

  /**
   * Update influencer
   */
  async update(id: string, data: InfluencerUpdate): Promise<Influencer> {
    const { data: influencer, error } = await this.supabase
      .from('influencers')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update influencer: ${error.message}`);
    return influencer as Influencer;
  }

  /**
   * Soft delete influencer
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('influencers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(`Failed to delete influencer: ${error.message}`);
  }
}

/**
 * OutreachLog Repository
 */
class OutreachLogRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new outreach log
   * 
   * The compound unique constraint on (campaign_id, influencer_id) ensures
   * that only ONE outreach record exists per campaign-influencer pair.
   * If you attempt to create a duplicate, this will throw an error.
   * 
   * Usage:
   *   await db.outreachLogs.create({
   *     campaign_id: 'uuid-123',
   *     influencer_id: 'uuid-456',
   *     status: 'pending',
   *     contact_method: 'email'
   *   });
   */
  async create(data: OutreachLogInsert): Promise<OutreachLog> {
    const { data: log, error } = await this.supabase
      .from('outreach_logs')
      .insert([data])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        throw new Error(
          `Outreach already exists for this campaign-influencer pair (${data.campaign_id}, ${data.influencer_id})`
        );
      }
      throw new Error(`Failed to create outreach log: ${error.message}`);
    }
    return log as OutreachLog;
  }

  /**
   * Retrieve outreach log by ID with relations
   */
  async getById(id: string): Promise<OutreachLogWithDetails | null> {
    const { data, error } = await this.supabase
      .from('outreach_logs')
      .select(
        `
        *,
        campaign:campaigns(*),
        influencer:influencers(*)
      `
      )
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch outreach log: ${error.message}`);
    }
    return (data as OutreachLogWithDetails) || null;
  }

  /**
   * List outreach logs for a campaign
   */
  async listByCampaign(
    campaignId: string,
    pagination?: PaginationParams
  ): Promise<OutreachLogWithDetails[]> {
    let query = this.supabase
      .from('outreach_logs')
      .select(
        `
        *,
        campaign:campaigns(*),
        influencer:influencers(*)
      `
      )
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 20, 100);
    const offset = (page - 1) * limit;

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw new Error(`Failed to list outreach logs: ${error.message}`);
    return (data as OutreachLogWithDetails[]) || [];
  }

  /**
   * List outreach logs for an influencer
   */
  async listByInfluencer(
    influencerId: string,
    pagination?: PaginationParams
  ): Promise<OutreachLogWithDetails[]> {
    let query = this.supabase
      .from('outreach_logs')
      .select(
        `
        *,
        campaign:campaigns(*),
        influencer:influencers(*)
      `
      )
      .eq('influencer_id', influencerId)
      .order('created_at', { ascending: false });

    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 20, 100);
    const offset = (page - 1) * limit;

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw new Error(`Failed to list outreach logs: ${error.message}`);
    return (data as OutreachLogWithDetails[]) || [];
  }

  /**
   * Update outreach log
   */
  async update(id: string, data: OutreachLogUpdate): Promise<OutreachLog> {
    const { data: log, error } = await this.supabase
      .from('outreach_logs')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update outreach log: ${error.message}`);
    return log as OutreachLog;
  }

  /**
   * Mark outreach as sent
   */
  async markSent(id: string, contactMethod: string = 'email'): Promise<OutreachLog> {
    return this.update(id, {
      status: 'sent',
      contact_method: contactMethod as any,
      sent_at: new Date().toISOString(),
    });
  }

  /**
   * Mark outreach as responded
   */
  async markResponded(id: string): Promise<OutreachLog> {
    return this.update(id, {
      status: 'engaged',
      responded: true,
      responded_at: new Date().toISOString(),
    });
  }

  /**
   * Delete outreach log
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('outreach_logs')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete outreach log: ${error.message}`);
  }
}

/**
 * Main Database Client
 * Aggregates all repositories
 */
export class SupabaseDatabaseClient {
  campaigns: CampaignRepository;
  influencers: InfluencerRepository;
  outreachLogs: OutreachLogRepository;

  constructor(supabase: SupabaseClient) {
    this.campaigns = new CampaignRepository(supabase);
    this.influencers = new InfluencerRepository(supabase);
    this.outreachLogs = new OutreachLogRepository(supabase);
  }
}

/**
 * Example Usage in Next.js API Route
 * 
 * File: /api/campaigns/[id]/outreach/route.ts
 * 
 * import { createClient } from '@supabase/supabase-js';
 * import { SupabaseDatabaseClient } from '@/lib/db/client';
 * 
 * export async function POST(req: Request, { params }) {
 * const supabase = createClient(...);
 * const db = new SupabaseDatabaseClient(supabase);
 * 
 * const { influencers } = await req.json();
 * 
 * // Create outreach logs for multiple influencers in a campaign
 * const results = await Promise.all(
 *   influencers.map(influencerId =>
 *     db.outreachLogs.create({
 *       campaign_id: params.id,
 *       influencer_id: influencerId,
 *       status: 'pending',
 *       contact_method: 'email'
 *     })
 *   )
 * );
 * 
 * return Response.json(results);
 * }
 */
