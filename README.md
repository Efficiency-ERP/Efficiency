# Efficiency — PME Management App

A Next.js application for managing Tunisian PMEs (Petites et Moyennes Entreprises): contacts, articles, invoices, deliveries, orders, issues, and logs. Connected to Supabase for auth and database.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** Supabase (PostgreSQL + RLS)
- **Auth:** Supabase Auth (email/password)
- **UI:** Radix UI + shadcn/ui + Tailwind CSS v4
- **Charts:** Recharts
- **Tables:** TanStack Table

## Getting Started

### 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → API** and copy the **URL** and **anon key**
3. Open `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### 2. Database Setup

Run the SQL scripts in **Supabase SQL Editor** in order:

1. `supabase/fix-permissions.sql` — one-time
2. `supabase/schema.sql` — creates tables
3. `supabase/rls.sql` — row-level security
4. `supabase/seed.sql` — demo data
5. Create users in **Auth → Users**
6. `supabase/assign-users.sql` — assign users to orgs

See `supabase/process.md` for full details.

### 3. Run the App

```bash
cd efficiency
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Default Login

| Email | Password | Access |
|-------|----------|--------|
| `adam@gmail.com` | `adam123` | Org A |
| `admin@gmail.com` | `admin123` | All orgs |

## Project Structure

```
efficiency/
├── public/              # Static assets (logos, icons)
├── src/
│   ├── app/             # Next.js App Router pages
│   │   ├── dashboard/   # Main dashboard pages
│   │   │   ├── articles/
│   │   │   ├── contacts/
│   │   │   ├── deliveries/
│   │   │   ├── invoices/
│   │   │   ├── issues/
│   │   │   ├── logs/
│   │   │   ├── orders/
│   │   │   ├── pme/
│   │   │   ├── profile/
│   │   │   └── settings/
│   │   └── login/       # Login page
│   ├── components/      # Shared UI components (shadcn/ui)
│   ├── contexts/        # React contexts (auth, contacts, articles, etc.)
│   ├── lib/             # Utilities and Supabase client
│   └── types/           # TypeScript types
└── supabase/            # SQL scripts and docs
```

## Features

- Multi-organization support with RLS
- Contact management (customers, suppliers)
- Article/product catalog
- Invoice creation with line items and consignment
- Delivery, order, and issue tracking
- Activity logs
- Dashboard with real-time KPIs (revenue, receivables, pipeline, stock)
