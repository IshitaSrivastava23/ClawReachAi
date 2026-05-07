import { NextResponse } from 'next/server';
import { CoreMessage, generateText, tool } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { supabase } from '@/lib/supabase';

const briefSchema = z.object({
  brandContext: z.string().min(1),
  targetAudience: z.string().min(1),
  creatorProfile: z.string().min(1),
  campaignGoal: z.string().min(1),
});

type Brief = z.infer<typeof briefSchema>;

const systemPrompt = [
  'You are the Claw Reach AI Bouncer. Your job is to gather four required pillars:',
  '1) Brand Context',
  '2) Target Audience',
  '3) Creator Profile',
  '4) Campaign Goal',
  '',
  'Rules:',
  '- If any pillar is missing, ask a concise, conversational question for ONLY the missing pillars.',
  '- If all four pillars are present, call the tool "finalizeBrief" with the complete values.',
  '- Do not invent details. Only use information provided by the user.',
].join('\n');

function toCoreMessages(rawMessages: unknown): CoreMessage[] {
  if (!Array.isArray(rawMessages)) {
    return [];
  }

  return rawMessages
    .map((message) => {
      if (!message || typeof message !== 'object') return null;
      const role = (message as { role?: string }).role;
      const content = (message as { content?: unknown }).content;
      if (typeof role !== 'string' || typeof content !== 'string') return null;
      if (role !== 'user' && role !== 'assistant' && role !== 'system') return null;
      return { role, content } as CoreMessage;
    })
    .filter((item): item is CoreMessage => Boolean(item));
}

async function insertCampaign(brief: Brief) {
  const { data, error } = await supabase
    .from('campaigns')
    .insert([
      {
        brand_context: brief.brandContext,
        target_audience: brief.targetAudience,
        creator_profile: brief.creatorProfile,
        campaign_goal: brief.campaignGoal,
        status: 'ready_for_openclaw',
      },
    ])
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create campaign: ${error.message}`);
  }

  return data;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = toCoreMessages(body?.messages);

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages,
      tools: {
        finalizeBrief: tool({
          description: 'Finalize a campaign brief with all four pillars.',
          parameters: briefSchema,
        }),
      },
      toolChoice: 'auto',
    });

    const toolCall = result.toolCalls?.find((call) => call.toolName === 'finalizeBrief');

    if (toolCall) {
      const brief = briefSchema.parse(toolCall.args);
      const campaign = await insertCampaign(brief);

      return NextResponse.json({
        status: 'started',
        campaignId: campaign.id,
        message: 'Campaign brief captured. OpenClaw is ready to start.',
      });
    }

    return NextResponse.json({
      status: 'needs_info',
      message: result.text || 'Tell me more about your campaign.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}
