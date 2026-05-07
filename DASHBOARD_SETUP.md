## Claw Reach AI Dashboard - Setup & Quick Start Guide

### Prerequisites
- Node.js 18+ and npm/yarn installed
- Supabase account (for production data)
- VS Code (recommended)

---

## 1. Installation

### Step 1: Install Dependencies
```bash
cd d:\ClawReachAI\ClawReachAi
npm install
# or
yarn install
```

### Step 2: Verify Installation
```bash
npm list react next tailwindcss
```

Expected output:
```
├── next@14.0.0
├── react@18.2.0
├── react-dom@18.2.0
└── tailwindcss@3.3.3
```

---

## 2. Development Server

### Start the Dev Server
```bash
npm run dev
```

Expected output:
```
> claw-reach-ai@0.1.0 dev
> next dev

  ▲ Next.js 14.0.0
  - Local:        http://localhost:3000
  - Environments: .env.local

✓ Ready in 1.2s
✓ Compiled in 2.5s
```

### Access the Dashboard
1. Open browser: `http://localhost:3000`
2. You should be redirected to `http://localhost:3000/dashboard`
3. See the 80/20 split layout with mock creators

---

## 3. Project Structure

```
app/
├── layout.tsx              Root layout (global styles)
├── page.tsx               Redirect to dashboard
├── globals.css            80/20 split CSS styles
└── dashboard/
    └── page.tsx           Main dashboard page

components/
├── CreatorCard.tsx        Individual creator card
├── ChatInput.tsx          Chat input sticky footer
├── ResultsGrid.tsx        Grid of creator cards
└── ui/                    Shadcn/UI components
    ├── badge.tsx
    ├── button.tsx
    └── input.tsx

lib/
├── mockData.ts            Sample creators & chat handler
└── utils.ts               Utility functions

Configuration:
├── tailwind.config.ts     Tailwind CSS config
├── tsconfig.json          TypeScript config
├── postcss.config.js      PostCSS config
├── next.config.js         Next.js config
└── package.json           Dependencies
```

---

## 4. Understanding the Layout

### 80/20 Vertical Split
- **Top 80%** (`.results-section`): Results Grid with creator cards
  - Scrollable independently
  - Responsive: 1 col (mobile) → 2 cols (tablet) → 3-4 cols (desktop)
  - CSS: `flex-1 overflow-y-auto`

- **Bottom 20%** (`.chat-section`): Chat Interface
  - Fixed/sticky position
  - Never scrolls off viewport
  - CSS: `h-1/5 flex-shrink-0`

### Key CSS Classes (in `app/globals.css`)
```css
.dashboard-container    /* h-screen, flex column */
.results-section       /* flex-1, overflow-y-auto */
.chat-section          /* h-1/5, sticky footer */
.creators-grid         /* CSS Grid, responsive columns */
```

---

## 5. Creator Card Features

The `CreatorCard` component displays:
1. **Channel Name** (bold header, dark indigo text)
2. **Subscriber Count** (formatted with K/M notation)
3. **Email** (highlighted in indigo-600 or muted if missing)
4. **Sponsors** (badge pills, max 3 shown + overflow indicator)
5. **Selection State** (highlight with indigo border/background)

**Component Location:** `components/CreatorCard.tsx`

**Props:**
```typescript
interface CreatorCardProps {
  channelName: string;
  subscriberCount: number;
  extractedEmail?: string | null;
  sponsors?: Sponsor[];
  isHighlighted?: boolean;
  onSelect?: () => void;
}
```

---

## 6. Chat Input Features

The `ChatInput` component provides:
1. **Message Input** - Text field with placeholder
2. **Send Button** - Indigo-600 CTA button
3. **Loading State** - Spinner animation when sending
4. **Keyboard Shortcuts** - Enter to send, Shift+Enter for newline
5. **Auto-focus** - Input focused when component mounts

**Component Location:** `components/ChatInput.tsx`

**Props:**
```typescript
interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  placeholder?: string;
  isLoading?: boolean;
}
```

---

## 7. Styling Guide

### Color Palette
| Element | Tailwind Class | Purpose |
|---------|-----------------|---------|
| Background | `bg-slate-50` | Clean, professional |
| Primary Text | `text-slate-900` | Dark, readable |
| Accent | `indigo-600` | Active states, CTAs |
| Hover | `hover:indigo-700` | Interactive feedback |
| Border | `border-slate-200` | Subtle separators |
| Muted | `text-slate-400` | Disabled, secondary text |

### Typography
```
Headers:  text-lg font-bold text-slate-900
Subtext:  text-sm text-slate-600
Labels:   text-xs font-semibold text-slate-500
```

### Spacing (Tailwind scale)
- `p-4` = 1rem (16px) padding
- `gap-3` = 0.75rem (12px) gap
- `rounded-lg` = 0.5rem (8px) border radius

---

## 8. Mock Data

### Sample Creators
Located in `lib/mockData.ts`:
```typescript
mockCreators: Creator[] = [
  {
    id: '1',
    channelName: 'TechReviews Daily',
    subscriberCount: 145000,
    extractedEmail: 'contact@techreviewsdaily.com',
    sponsors: [{ name: 'OpenAI' }, { name: 'Google' }]
  },
  // ... more creators
]
```

### Mock Chat Handler
```typescript
mockHandleChatMessage(message: string): Promise<{ creators: Creator[] }>
```

Filters creators based on keywords:
- "large", ">500k" → filter by subscriber count
- "tech", "ai", "software" → filter by channel name
- "has email" → filter by email availability

---

## 9. Connecting to Real Data

### Replace Mock with Supabase

**In `app/dashboard/page.tsx`:**

```typescript
import { createClient } from '@supabase/supabase-js';
import { SupabaseDatabaseClient } from '@/lib/db/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function DashboardPage() {
  const db = new SupabaseDatabaseClient(supabase);
  
  // Fetch real creators
  const creators = await db.influencers.list({ limit: 20 });
  
  // Use in component instead of mockCreators
}
```

---

## 10. Building for Production

### Build the Application
```bash
npm run build
```

Expected output:
```
Route (app)                           Size     First Load JS
┌ ○ /                                 149 B          82.5 kB
├ ○ /_not-found                       0 B                0 B
└ ○ /dashboard                        2.5 kB     84.9 kB

✓ Build successful
```

### Run Production Build Locally
```bash
npm run start
```

---

## 11. Type Safety

### TypeScript Configuration
- Strict mode enabled
- Path aliases configured (`@/*` → root)
- Type checking: `npm run type-check`

### Interfaces Available

**Creator Card:**
```typescript
import { Sponsor } from '@/components/CreatorCard';
```

**Chat Input:**
```typescript
import { ChatInputProps } from '@/components/ChatInput';
```

**Results Grid:**
```typescript
import { Creator, ResultsGridProps } from '@/components/ResultsGrid';
```

---

## 12. Common Tasks

### Hot Reload During Development
- Edit any `.tsx` file and save
- Browser automatically updates (HMR)
- CSS changes apply instantly

### Debug Layout Issues
1. Open DevTools (F12)
2. Inspect `.dashboard-container` element
3. Check computed styles for `height`, `overflow`, `flex`
4. Verify `min-h-0` on `.results-section`

### Test Responsive Design
1. DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. Test at:
   - Mobile (375px)
   - Tablet (768px)
   - Desktop (1024px)
   - Wide (1440px)

### Test Chat Input
1. Type a message in the chat input
2. Press Enter to send
3. Mock handler filters creators
4. Grid updates with new results

---

## 13. Environment Variables

Create `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

These are optional for development (mock data works without them).

---

## 14. Troubleshooting

### Issue: `Module not found: '@/components/...`
**Solution:** Ensure `baseUrl` and `paths` are set in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  }
}
```

### Issue: Chat input scrolls with content
**Solution:** Verify `.results-section` has `min-h-0`:
```css
.results-section {
  flex: 1;
  min-h-0;  /* Critical! */
  overflow-y: auto;
}
```

### Issue: Tailwind CSS not working
**Solution:** Run `npm install` and restart dev server:
```bash
npm install
npm run dev
```

### Issue: Creator cards not showing
**Solution:** Check console for errors. Verify:
1. Mock data is imported correctly
2. Creator component props are valid
3. `creators` array has length > 0

---

## 15. Next Steps

1. ✅ Dashboard layout complete
2. 🔲 Connect to Supabase database
3. 🔲 Integrate Bouncer API (/api/chat)
4. 🔲 Implement OpenClaw worker sync
5. 🔲 Add real authentication
6. 🔲 Deploy to Vercel

---

## Resources

- **Next.js Docs:** https://nextjs.org/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Shadcn/UI:** https://ui.shadcn.com
- **React:** https://react.dev
- **TypeScript:** https://www.typescriptlang.org/docs

---

## Support

For issues or questions:
1. Check this guide first
2. Review component files for inline comments
3. Check Next.js error messages in console
4. See `DASHBOARD_IMPLEMENTATION.md` for architecture details
