/**
 * Mock Data and Sample Creators for Dashboard
 * 
 * In production, this would be replaced with real API calls
 * to the Supabase database and OpenClaw service
 */

interface Sponsor {
  name: string;
  logo?: string;
}

interface Creator {
  id: string;
  channelName: string;
  subscriberCount: number;
  extractedEmail: string | null;
  sponsors?: Sponsor[];
}

// Sample creators for demo purposes
export const mockCreators: Creator[] = [
  {
    id: '1',
    channelName: 'TechReviews Daily',
    subscriberCount: 145000,
    extractedEmail: 'contact@techreviewsdaily.com',
    sponsors: [
      { name: 'OpenAI' },
      { name: 'Google' },
      { name: 'Microsoft' },
    ],
  },
  {
    id: '2',
    channelName: 'AI for Beginners',
    subscriberCount: 234000,
    extractedEmail: 'hello@aiforbeginners.io',
    sponsors: [
      { name: 'Hugging Face' },
      { name: 'AWS' },
    ],
  },
  {
    id: '3',
    channelName: 'Code Masters',
    subscriberCount: 567000,
    extractedEmail: null,
    sponsors: [
      { name: 'GitHub' },
      { name: 'JetBrains' },
      { name: 'Vercel' },
      { name: 'Firebase' },
    ],
  },
  {
    id: '4',
    channelName: 'Developer Diaries',
    subscriberCount: 89000,
    extractedEmail: 'pr@developerdiaries.dev',
    sponsors: [
      { name: 'Digital Ocean' },
    ],
  },
  {
    id: '5',
    channelName: 'Web Dev Mastery',
    subscriberCount: 456000,
    extractedEmail: 'contact@webdevmastery.com',
    sponsors: [
      { name: 'React' },
      { name: 'Next.js' },
      { name: 'Tailwind CSS' },
    ],
  },
  {
    id: '6',
    channelName: 'Full Stack Academy',
    subscriberCount: 312000,
    extractedEmail: 'business@fullstackacademy.com',
    sponsors: [
      { name: 'MongoDB' },
      { name: 'PostgreSQL' },
      { name: 'Redis' },
    ],
  },
  {
    id: '7',
    channelName: 'Cloud Computing Weekly',
    subscriberCount: 1200000,
    extractedEmail: 'partnerships@cloudcomputingweekly.io',
    sponsors: [
      { name: 'AWS' },
      { name: 'Azure' },
      { name: 'Google Cloud' },
    ],
  },
  {
    id: '8',
    channelName: 'Security First',
    subscriberCount: 178000,
    extractedEmail: null,
    sponsors: [
      { name: 'Cloudflare' },
      { name: 'Auth0' },
    ],
  },
];

/**
 * Mock Handler for Chat Messages
 * 
 * Simulates the Bouncer API processing the user's message
 * In production, this would call /api/chat endpoint
 */
export async function mockHandleChatMessage(
  message: string
): Promise<{ creators: Creator[]; response?: string }> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Simple keyword matching to filter creators
  const lowerMessage = message.toLowerCase();

  let filtered = mockCreators;

  // Filter by subscriber count mentions
  if (lowerMessage.includes('large') || lowerMessage.includes('>500k')) {
    filtered = filtered.filter((c) => c.subscriberCount > 500000);
  } else if (lowerMessage.includes('small') || lowerMessage.includes('<200k')) {
    filtered = filtered.filter((c) => c.subscriberCount < 200000);
  }

  // Filter by tech-related keywords
  if (
    lowerMessage.includes('tech') ||
    lowerMessage.includes('software') ||
    lowerMessage.includes('ai')
  ) {
    filtered = filtered.filter((c) =>
      [
        'tech',
        'ai',
        'code',
        'developer',
        'web',
        'cloud',
        'security',
        'full stack',
      ].some((keyword) => c.channelName.toLowerCase().includes(keyword))
    );
  }

  // Filter by email availability
  if (lowerMessage.includes('has email') || lowerMessage.includes('with email')) {
    filtered = filtered.filter((c) => c.extractedEmail !== null);
  }

  return {
    creators: filtered,
    response: `Found ${filtered.length} creators matching your criteria.`,
  };
}

/**
 * Sample campaign data for testing
 */
export const mockCampaignContext = {
  brandContext: 'AI-powered SaaS productivity tool',
  targetAudience: 'Software developers and tech entrepreneurs',
  creatorProfile: 'Mid-tier technical content creators (50K-500K subscribers)',
  campaignGoal: 'Product launch awareness and beta user acquisition',
};
