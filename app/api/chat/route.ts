import { NextResponse } from 'next/server';
import { CoreMessage, generateText, tool } from 'ai';
import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';
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
  const { data, error: dbError } = await supabase
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

  if (dbError) {
    throw new Error(`Supabase Insert Failed: ${dbError.message}`);
  }

  return data;
}

export async function POST(req: Request) {
  try {
    if (!process.env.AI_API_KEY) {
      return NextResponse.json(
        { error: 'Server Error: AI_API_KEY is missing' },
        { status: 500 }
      );
    }

    const baseURL = process.env.AI_BASE_URL;
    if (!baseURL) {
      return NextResponse.json(
        { error: 'Server Error: AI_BASE_URL is missing' },
        { status: 500 }
      );
    }

    const modelName = process.env.AI_MODEL || 'openai/gpt-4o-mini';

    const body = await req.json();
    const messages = toCoreMessages(body?.messages);

    const openai = createOpenAI({
      apiKey: process.env.AI_API_KEY,
      baseURL,
      compatibility: 'compatible',
    });

    const result = await generateText({
      model: openai(modelName),
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
    console.error('🔥 BOUNCER API CRASH:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
