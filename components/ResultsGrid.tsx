'use client';

import { CreatorCard } from './CreatorCard';

/**
 * Results Grid Component
 * 
 * Displays a CSS Grid of Creator Cards
 * - Responsive columns: 1 (mobile) → 2 (tablet) → 3 (desktop) → 4 (wide)
 * - Handles overflow scrolling independently from chat input
 * - Auto-fills with sample data or live data from props
 */

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

interface ResultsGridProps {
  creators: Creator[];
  onCreatorSelect?: (creator: Creator) => void;
  selectedCreatorId?: string;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
}

export function ResultsGrid({
  creators,
  onCreatorSelect,
  selectedCreatorId,
  isLoading = false,
  emptyState,
}: ResultsGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 mb-4">
            <div className="h-8 w-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          </div>
          <p className="text-slate-600 font-medium">Finding creators...</p>
          <p className="text-slate-500 text-sm mt-1">
            Analyzing your campaign requirements
          </p>
        </div>
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        {emptyState ? (
          emptyState
        ) : (
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 mb-4">
              <svg
                className="h-6 w-6 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mt-2">
              No creators found
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Chat with the assistant to start your campaign
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="creators-grid">
      {creators.map((creator) => (
        <CreatorCard
          key={creator.id}
          channelName={creator.channelName}
          subscriberCount={creator.subscriberCount}
          extractedEmail={creator.extractedEmail}
          sponsors={creator.sponsors}
          isHighlighted={selectedCreatorId === creator.id}
          onSelect={() => onCreatorSelect?.(creator)}
        />
      ))}
    </div>
  );
}
