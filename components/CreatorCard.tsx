'use client';

import { Badge } from '@/components/ui/badge';
import { Mail, Users } from 'lucide-react';

/**
 * Creator Card Component
 * 
 * Displays influencer/creator information with:
 * - Channel name (bold header)
 * - Subscriber count (formatted with K/M)
 * - Extracted email (highlighted or muted if null)
 * - Recent sponsors badges
 */

interface Sponsor {
  name: string;
  logo?: string;
}

interface CreatorCardProps {
  channelName: string;
  subscriberCount: number;
  extractedEmail?: string | null;
  sponsors?: Sponsor[];
  isHighlighted?: boolean;
  onSelect?: () => void;
}

function formatSubscribers(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(0)}K`;
  }
  return count.toString();
}

export function CreatorCard({
  channelName,
  subscriberCount,
  extractedEmail,
  sponsors = [],
  isHighlighted = false,
  onSelect,
}: CreatorCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`
        flex flex-col gap-3 p-4 rounded-lg border transition-all duration-200 cursor-pointer
        ${isHighlighted
          ? 'border-indigo-600 bg-indigo-50 shadow-md ring-1 ring-indigo-200'
          : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
        }
      `}
    >
      {/* Channel Name Header */}
      <div className="flex-1">
        <h3 className="text-lg font-bold text-slate-900 truncate hover:text-indigo-600 transition-colors">
          {channelName}
        </h3>
      </div>

      {/* Subscriber Count */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Users className="h-4 w-4 text-indigo-600" />
        <span className="font-semibold text-slate-900">
          {formatSubscribers(subscriberCount)}
        </span>
        <span className="text-slate-500">subscribers</span>
      </div>

      {/* Email Section */}
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
        {extractedEmail ? (
          <a
            href={`mailto:${extractedEmail}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium truncate hover:underline"
          >
            {extractedEmail}
          </a>
        ) : (
          <span className="text-sm text-slate-400 italic">No email available</span>
        )}
      </div>

      {/* Sponsors Badges */}
      {sponsors && sponsors.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-500 font-semibold mb-2">Recent Sponsors:</div>
          <div className="flex flex-wrap gap-2">
            {sponsors.slice(0, 3).map((sponsor, idx) => (
              <Badge
                key={idx}
                variant={isHighlighted ? 'default' : 'secondary'}
                className={`text-xs ${
                  isHighlighted
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {sponsor.name}
              </Badge>
            ))}
            {sponsors.length > 3 && (
              <Badge
                variant="outline"
                className="text-xs text-slate-500 border-slate-200"
              >
                +{sponsors.length - 3}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
