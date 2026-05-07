'use client';

import { useState, useCallback, useEffect } from 'react';
import { ChatInput } from '@/components/ChatInput';
import { ResultsGrid } from '@/components/ResultsGrid';
import { supabase } from '@/lib/supabase';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import { useToast } from '@/components/ui/use-toast';
import { Sparkles } from 'lucide-react';

/**
 * Dashboard Page (Main View)
 * 
 * Layout: 80/20 vertical split
 * - Top 80%: Results Grid (scrollable)
 * - Bottom 20%: Chat Input (fixed/sticky)
 * 
 * Key behaviors:
 * - Results grid scrolls independently within 80% viewport
 * - Chat input fixed at bottom, never scrolls
 * - Responsive on all screen sizes
 */

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Sponsor {
  name: string;
  logo?: string;
}

interface Creator {
  id: string;
  channelName: string;
  subscriberCount: number;
  extractedEmail?: string | null;
  sponsors?: Sponsor[];
}

interface OutreachLogWithInfluencer {
  influencers: {
    id: string;
    channel_name: string;
    subscriber_count: number;
    extracted_email: string | null;
    sponsors: unknown;
  } | null;
}

function normalizeSponsors(value: unknown): Sponsor[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const name = (entry as { name?: unknown }).name;
        const logo = (entry as { logo?: unknown }).logo;
        if (typeof name !== 'string') return null;
        return typeof logo === 'string' ? { name, logo } : { name };
      })
      .filter((entry): entry is Sponsor => Boolean(entry));
  }

  return [];
}

export default function DashboardPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const fetchInfluencersForCampaign = useCallback(async (campaignId: string) => {
    const { data, error } = await supabase
      .from('outreach_logs')
      .select(
        `
        influencers (
          id,
          channel_name,
          subscriber_count,
          extracted_email,
          sponsors
        )
        `
      )
      .eq('campaign_id', campaignId);

    if (error) {
      console.error('Failed to hydrate influencers:', error.message);
      return;
    }

    const nextCreators = (data as OutreachLogWithInfluencer[])
      .map((row) => row.influencers)
      .filter((influencer): influencer is NonNullable<OutreachLogWithInfluencer['influencers']> =>
        Boolean(influencer)
      )
      .map((influencer) => ({
        id: influencer.id,
        channelName: influencer.channel_name,
        subscriberCount: influencer.subscriber_count,
        extractedEmail: influencer.extracted_email,
        sponsors: normalizeSponsors(influencer.sponsors),
      }));

    setCreators(nextCreators);
  }, []);

  const handleSendMessage = useCallback(
    async (message: string) => {
      try {
        setIsLoading(true);
        const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: message }];
        setMessages(nextMessages);

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: nextMessages }),
        });

        if (!response.ok) {
          throw new Error(`Bouncer API failed with status ${response.status}`);
        }

        const payload = (await response.json()) as {
          status: 'started' | 'needs_info' | 'error';
          message?: string;
          campaignId?: string;
        };

        if (payload.status === 'started' && payload.campaignId) {
          setActiveCampaignId(payload.campaignId);
          if (payload.message) {
            setMessages((current) => [...current, { role: 'assistant', content: payload.message! }]);
          }
          return;
        }

        if (payload.message) {
          setMessages((current) => [...current, { role: 'assistant', content: payload.message! }]);
        }
      } catch (error) {
        console.error('Error processing message:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to reach the Bouncer API.',
          description: 'Please check your connection and try again.',
        });
        setMessages((current) => [
          ...current,
          { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages]
  );

  useEffect(() => {
    if (!activeCampaignId) return;

    fetchInfluencersForCampaign(activeCampaignId);

    const channel = supabase
      .channel(`outreach_logs:${activeCampaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'outreach_logs',
          filter: `campaign_id=eq.${activeCampaignId}`,
        },
        (_payload: RealtimePostgresInsertPayload<Record<string, unknown>>) => {
          fetchInfluencersForCampaign(activeCampaignId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCampaignId, fetchInfluencersForCampaign]);

  return (
    <div className="dashboard-container">
      {/* Top 80%: Results Grid (Scrollable) */}
      <section className="results-section">
        <ResultsGrid
          creators={creators}
          selectedCreatorId={selectedCreatorId}
          onCreatorSelect={(creator) => setSelectedCreatorId(creator.id)}
          isLoading={isLoading}
          emptyState={
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 mb-4">
                <Sparkles className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mt-2">
                Awaiting Campaign Brief
              </h3>
              <p className="text-slate-600 text-sm mt-2 max-w-xs">
                Chat below to start discovering creators.
              </p>
            </div>
          }
        />
      </section>

      {/* Bottom 20%: Chat Input (Fixed/Sticky) */}
      <section className="chat-section">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          placeholder="Tell me about your brand and target audience..."
        />
      </section>
    </div>
  );
}
