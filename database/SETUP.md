## Claw Reach AI Database Setup Guide

This guide covers the normalized 3-table architecture, migration deployment, and best practices.

---

## Table of Contents
1. [Migration Deployment](#migration-deployment)
2. [Schema Overview](#schema-overview)
3. [Key Constraints](#key-constraints)
4. [Realtime Configuration](#realtime-configuration)
5. [UPSERT Patterns](#upsert-patterns)
6. [API Integration Examples](#api-integration-examples)

---

## Migration Deployment

### Deploy to Supabase (via Dashboard)

1. **Open Supabase Dashboard** → Your Project → SQL Editor
2. **Create a new query** and paste the contents of `database/migrations/001_create_core_tables.sql`
3. **Execute the query**
4. Verify tables are created in the **Schema Editor** tab

### Deploy via Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Create migrations directory structure
supabase migrations new create_core_tables

# Copy contents of 001_create_core_tables.sql into the migration file
# File location: supabase/migrations/[TIMESTAMP]_create_core_tables.sql

# Deploy migration
supabase db push
```

---

## Schema Overview

### 1. **Campaigns Table**
Central hub for brand campaign orchestration.

```sql
Columns:
  - id (UUID, Primary Key)
  - brand_context (TEXT)
  - target_audience (TEXT)
  - creator_profile (TEXT)
  - campaign_goal (TEXT)
  - status (ENUM: draft | ready_for_openclaw | processing | completed)
  - created_at, updated_at, deleted_at (Timestamps)
```

**Primary Use:** Store the 4 Pillars extracted by the Bouncer API.

---

### 2. **Influencers Table**
Global master list of influencers (immutable reference data).

```sql
Columns:
  - id (UUID, Primary Key)
  - channel_id (VARCHAR, UNIQUE) ← Natural key for UPSERT
  - channel_name (VARCHAR)
  - subscriber_count (INTEGER)
  - extracted_email (VARCHAR, nullable)
  - sponsors (JSONB) ← Flexible metadata
  - created_at, updated_at, deleted_at (Timestamps)
```

**Primary Use:** Maintained by OpenClaw worker via UPSERT operations.

**Key Constraint:** `UNIQUE(channel_id)` allows efficient UPSERT.

---

### 3. **OutreachLogs Table (Junction)**
Maps influencers to campaigns with engagement tracking.

```sql
Columns:
  - id (UUID, Primary Key)
  - campaign_id (UUID, FK → campaigns)
  - influencer_id (UUID, FK → influencers)
  - status (ENUM: pending | sent | engaged | rejected | no_contact)
  - contact_method (VARCHAR)
  - message_preview (TEXT)
  - opened, clicked, responded (BOOLEAN)
  - sent_at, responded_at (Timestamps)
  - created_at, updated_at (Timestamps)

UNIQUE Constraint: (campaign_id, influencer_id)
```

**Primary Use:**
- Prevent duplicate outreach to same influencer in same campaign
- Track engagement metrics per outreach attempt
- Frontend listens to `INSERT` events via Supabase Realtime

---

## Key Constraints

### Compound Unique Constraint (outreach_logs)

```sql
UNIQUE(campaign_id, influencer_id)
```

**Purpose:** Only ONE outreach record per campaign-influencer pair.

**Example Violation:**
```sql
-- First insert: OK
INSERT INTO outreach_logs (campaign_id, influencer_id, status)
VALUES ('uuid-123', 'uuid-456', 'pending');

-- Second insert: VIOLATES UNIQUE CONSTRAINT (23505 error)
INSERT INTO outreach_logs (campaign_id, influencer_id, status)
VALUES ('uuid-123', 'uuid-456', 'pending');
-- Error: duplicate key value violates unique constraint "outreach_logs_campaign_id_influencer_id_key"
```

**Solution:** Use the SupabaseDatabaseClient.outreachLogs.create() which handles errors gracefully.

---

### UNIQUE Constraint (influencers.channel_id)

```sql
UNIQUE(channel_id)
```

**Purpose:** Enable UPSERT for OpenClaw worker integration.

**Behavior:**
```typescript
// Duplicate channel_id → UPDATE existing record
await db.influencers.upsert({
  channel_id: 'UC1234567890', // Already exists
  channel_name: 'Updated Name',
  subscriber_count: 250000  // Updated
});
// Result: Existing record is updated, not duplicated
```

---

### Foreign Key Constraints (with CASCADE Delete)

```sql
campaign_id REFERENCES campaigns(id) ON DELETE CASCADE
influencer_id REFERENCES influencers(id) ON DELETE CASCADE
```

**Purpose:** Maintain referential integrity. When a campaign is deleted, all its outreach_logs are automatically deleted.

---

## Realtime Configuration

### Enable Supabase Realtime (Required for Frontend)

The frontend listens to `INSERT` events on `outreach_logs` via WebSocket.

**Step 1: Enable WAL in Supabase Dashboard**

1. Go to **Settings** → **Database** → **Replication**
2. Verify "Realtime" is enabled (should be by default)
3. Check that `outreach_logs` table is in the publication list

**Step 2: Verify REPLICA IDENTITY (Best Practice)**

```sql
-- Run in Supabase SQL Editor
ALTER TABLE campaigns REPLICA IDENTITY FULL;
ALTER TABLE influencers REPLICA IDENTITY FULL;
ALTER TABLE outreach_logs REPLICA IDENTITY FULL;
```

This ensures full row data is sent to subscribers (needed for UPDATE/DELETE events).

**Step 3: Frontend Subscription (Next.js Example)**

```typescript
// File: components/CampaignDashboard.tsx
import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export function CampaignDashboard() {
  useEffect(() => {
    // Subscribe to INSERT events on outreach_logs
    const subscription = supabase
      .from('outreach_logs')
      .on('INSERT', (payload) => {
        console.log('New outreach:', payload.new);
        // Update UI with new outreach_log
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <div>{/* Dashboard content */}</div>;
}
```

---

## UPSERT Patterns

### Pattern 1: Influencer UPSERT (by channel_id)

**Scenario:** OpenClaw worker discovered a new influencer or updated existing one.

```typescript
import { SupabaseDatabaseClient } from '@/lib/db/client';

const db = new SupabaseDatabaseClient(supabase);

// Single upsert
await db.influencers.upsert({
  channel_id: 'UC1234567890',
  channel_name: 'TechReviews Daily',
  subscriber_count: 150000,
  extracted_email: 'contact@tech.com',
  sponsors: { verified: true, verified_date: '2025-01-01' }
});
// Result: Created if new, updated if channel_id exists
```

### Pattern 2: Bulk Influencer UPSERT

**Scenario:** OpenClaw worker syncs 100+ influencers at once.

```typescript
const influencers = [
  {
    channel_id: 'UC1234567890',
    channel_name: 'TechReviews Daily',
    subscriber_count: 150000,
    extracted_email: 'contact@tech.com'
  },
  {
    channel_id: 'UC0987654321',
    channel_name: 'FitLife Coach',
    subscriber_count: 500000,
    extracted_email: 'pr@fitlife.com'
  }
  // ... more influencers
];

await db.influencers.upsertBatch(influencers);
// Result: All records created or updated efficiently in one batch
```

### Pattern 3: Outreach Log Creation with Duplicate Prevention

**Scenario:** Create outreach logs for influencers in a campaign.

```typescript
try {
  await db.outreachLogs.create({
    campaign_id: 'campaign-uuid',
    influencer_id: 'influencer-uuid',
    status: 'pending',
    contact_method: 'email'
  });
} catch (error) {
  if (error.message.includes('duplicate key')) {
    console.log('Outreach already exists for this pair');
    // Handle gracefully (skip or update)
  }
}
```

---

## API Integration Examples

### Example 1: Create a Campaign

**File:** `app/api/campaigns/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { SupabaseDatabaseClient } from '@/lib/db/client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const db = new SupabaseDatabaseClient(supabase);

export async function POST(req: NextRequest) {
  try {
    const { brand_context, target_audience, creator_profile, campaign_goal } = await req.json();

    const campaign = await db.campaigns.create({
      brand_context,
      target_audience,
      creator_profile,
      campaign_goal,
      status: 'draft'
    });

    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### Example 2: List Campaigns by Status

**File:** `app/api/campaigns/route.ts`

```typescript
export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get('status');
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');

    const campaigns = await db.campaigns.list(
      { page, limit: 20 },
      status as any
    );

    return NextResponse.json({ success: true, data: campaigns });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### Example 3: Update Campaign Status

**File:** `app/api/campaigns/[id]/route.ts`

```typescript
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { status } = await req.json();

    const campaign = await db.campaigns.updateStatus(params.id, status);

    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### Example 4: Outreach Logs for Campaign

**File:** `app/api/campaigns/[id]/outreach/route.ts`

```typescript
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');

    const outreachLogs = await db.outreachLogs.listByCampaign(params.id, {
      page,
      limit: 20
    });

    return NextResponse.json({ success: true, data: outreachLogs });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### Example 5: OpenClaw Worker UPSERT Sync

**File:** `app/api/influencers/sync/route.ts`

```typescript
export async function POST(req: NextRequest) {
  // This endpoint is called by OpenClaw worker
  try {
    const { influencers } = await req.json();

    const synced = await db.influencers.upsertBatch(influencers);

    return NextResponse.json({
      success: true,
      message: `Synced ${synced.length} influencers`,
      data: synced
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

---

## Best Practices

### 1. Always Use the Database Client
Don't query Supabase directly; use the `SupabaseDatabaseClient` for type safety and consistency.

### 2. Handle Unique Constraint Errors
```typescript
try {
  await db.outreachLogs.create(...);
} catch (error) {
  if (error.code === '23505') {
    // Unique constraint violation
  }
}
```

### 3. Use Batch Operations for Performance
```typescript
// Good: Single batch call
await db.influencers.upsertBatch(influencers);

// Bad: Multiple individual calls in loop
for (const influencer of influencers) {
  await db.influencers.upsert(influencer);
}
```

### 4. Implement Pagination for Large Datasets
```typescript
// Always paginate to avoid timeouts
const campaigns = await db.campaigns.list({ page: 1, limit: 20 });
```

### 5. Soft Deletes Over Hard Deletes
The schema includes `deleted_at` timestamps. Use soft deletes for audit trails.

```typescript
await db.campaigns.delete(id); // Sets deleted_at, doesn't remove record
```

### 6. Monitor Realtime Connections
Supabase Realtime connections are rate-limited. Implement cleanup:

```typescript
useEffect(() => {
  const subscription = supabase.from('outreach_logs').on('INSERT', ...).subscribe();
  return () => subscription.unsubscribe(); // Clean up on unmount
}, []);
```

---

## Troubleshooting

### Issue: "Column does not exist" errors
**Solution:** Ensure migration has been run. Check schema in Supabase Dashboard.

### Issue: "Unique constraint violation" on channel_id
**Solution:** Use UPSERT instead of INSERT:
```typescript
await db.influencers.upsert(data); // Not .create()
```

### Issue: Realtime events not arriving
**Solution:**
1. Verify table is in Realtime publication (Settings → Database → Replication)
2. Check browser console for WebSocket errors
3. Ensure `REPLICA IDENTITY FULL` is set on the table

### Issue: Foreign key constraint violation
**Solution:** Ensure campaign_id and influencer_id exist before creating outreach_logs.

---

## Next Steps

1. ✅ Deploy migration to Supabase
2. ✅ Import `database.ts` types in your Next.js pages
3. ✅ Create API routes using `SupabaseDatabaseClient`
4. ✅ Enable Supabase Realtime for frontend subscriptions
5. ✅ Integrate with Bouncer API to create campaigns
6. ✅ Connect OpenClaw worker to UPSERT influencers
7. ✅ Build dashboard to display outreach_logs in real-time

---

## Quick Reference

| Operation | Method | Returns |
|-----------|--------|---------|
| Create campaign | `db.campaigns.create()` | `Campaign` |
| Update campaign | `db.campaigns.update()` | `Campaign` |
| Update status | `db.campaigns.updateStatus()` | `Campaign` |
| List campaigns | `db.campaigns.list()` | `Campaign[]` |
| UPSERT influencer | `db.influencers.upsert()` | `Influencer` |
| Bulk UPSERT | `db.influencers.upsertBatch()` | `Influencer[]` |
| Create outreach | `db.outreachLogs.create()` | `OutreachLog` |
| Mark sent | `db.outreachLogs.markSent()` | `OutreachLog` |
| Mark responded | `db.outreachLogs.markResponded()` | `OutreachLog` |

