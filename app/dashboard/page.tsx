'use client';

import { useState, useCallback } from 'react';
import { ChatInput } from '@/components/ChatInput';
import { ResultsGrid } from '@/components/ResultsGrid';
import { mockCreators, mockHandleChatMessage } from '@/lib/mockData';

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

export default function DashboardPage() {
  const [creators, setCreators] = useState(mockCreators);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = useCallback(async (message: string) => {
    try {
      setIsLoading(true);
      
      // Simulate API call to chat/bouncer endpoint
      const response = await mockHandleChatMessage(message);
      
      // Update creators based on response
      if (response.creators) {
        setCreators(response.creators);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
                <svg
                  className="h-6 w-6 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 10h-2m0 0H9m3 0V7m0 3v2m11-11H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mt-2">
                Start Your Campaign
              </h3>
              <p className="text-slate-600 text-sm mt-2 max-w-xs">
                Describe your brand, target audience, and campaign goals in the chat below
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
