# Efficiency — PME Management App

A Next.js application for managing Tunisian PMEs (Petites et Moyennes Entreprises): contacts, articles, invoices, deliveries, orders, issues, and logs. Connected to Supabase for auth and database.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** Supabase (PostgreSQL + RLS)
- **Auth:** Supabase Auth (email/password)
- **UI:** Radix UI + shadcn/ui + Tailwind CSS v4
- **Charts:** Recharts
- **Tables:** TanStack Table

## Getting Started

### 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → API** and copy the **URL** and **anon key**
3. Copy `.env.local.example` to `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_TESTING_MODE=true
   ```

### 2. Database Setup

Open **Supabase SQL Editor** and run the scripts in order:

| Order | File | Purpose |
|-------|------|---------|
| 1 | `01-schema.sql` | Creates all tables, enums, indexes, functions |
| 2 | `02-rls.sql` | Row Level Security policies |
| 3 | `03-seed.sql` | Demo data (orgs, contacts, articles) |
| 4 | `04-assign-users.sql` | Links auth users to organizations |
| 5 | `05-testing-mode.sql` | Feedback system (optional) |

All scripts are **idempotent** — safe to re-run without breaking anything.

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
├── public/                  # Static assets (logos, icons)
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout (providers, font, metadata)
│   │   ├── providers.tsx    # Theme, navigation, auth + feedback widget
│   │   ├── page.tsx         # Root redirect (auth → /dashboard, else → /login)
│   │   ├── login/           # Login page
│   │   ├── auth/            # OAuth callback handler
│   │   └── dashboard/
│   │       ├── layout.tsx   # Auth guard + DashboardShell
│   │       ├── page.tsx     # KPI dashboard with charts
│   │       ├── articles/    # Article CRUD
│   │       ├── contacts/    # Contact CRUD
│   │       ├── invoices/    # Invoice CRUD + line items
│   │       ├── deliveries/  # Delivery notes (BL)
│   │       ├── orders/      # Purchase/sales orders (BC)
│   │       ├── issues/      # Warehouse issues (BS)
│   │       ├── logs/        # Activity logs
│   │       ├── pme/         # Organization management
│   │       ├── profile/     # User profile
│   │       ├── settings/    # User settings
│   │       └── feedback/    # My feedback history
│   ├── components/
│   │   ├── ui/              # shadcn/ui primitives (button, card, select, etc.)
│   │   ├── dashboard-shell.tsx  # Dashboard layout with sidebar
│   │   ├── feedback-widget.tsx  # Floating feedback form (testing mode)
│   │   ├── app-sidebar.tsx      # Sidebar navigation
│   │   ├── data-table.tsx       # Reusable TanStack Table wrapper
│   │   └── ...
│   ├── contexts/            # React contexts (auth, contacts, articles, logs)
│   ├── hooks/               # Custom hooks
│   ├── lib/
│   │   ├── supabase/        # Client, server, middleware, API modules
│   │   │   ├── client.ts    # Browser client (singleton)
│   │   │   ├── server.ts    # Server client (cookies)
│   │   │   ├── middleware.ts # Auth middleware (session refresh + redirect)
│   │   │   ├── articles.ts  # Articles API
│   │   │   ├── contacts.ts  # Contacts API
│   │   │   ├── invoices.ts  # Invoices, deliveries, orders, issues API
│   │   │   ├── logs.ts      # Logs API
│   │   │   └── feedback.ts  # Feedback API
│   │   └── utils.ts         # cn(), formatTND(), castJson()
│   ├── types/               # TypeScript types (database schema)
│   └── middleware.ts        # Next.js middleware entry point
├── admin/                   # Standalone feedback admin dashboard (Vite + React)
│   ├── src/
│   │   ├── App.tsx          # Admin UI to view/manage feedbacks
│   │   └── lib/supabase.ts  # Supabase client + fetch functions
│   └── package.json
└── supabase/                # SQL scripts (run in order)
    ├── 01-schema.sql
    ├── 02-rls.sql
    ├── 03-seed.sql
    ├── 04-assign-users.sql
    └── 05-testing-mode.sql
```

## Features

- **Auth:** Email/password login with Supabase Auth, middleware-based route protection
- **Multi-org:** Organization switcher in header, RLS-based data isolation
- **Contacts:** Customer/supplier management with search and filters
- **Articles:** Product/service catalog with stock tracking and consignment
- **Invoices:** Full invoice creation with line items, VAT, discount, and consignment
- **Documents:** Delivery notes (BL), purchase orders (BC), warehouse issues (BS)
- **Dashboard:** KPIs — revenue MTD, receivables, cash collected, VAT, pipeline charts
- **Activity Logs:** Audit trail for all document changes
- **Testing Mode:** Floating feedback widget on every page (toggle via env var)
- **Feedback Admin:** Standalone local app to view/manage feedbacks with attachments

## Testing Mode

When `NEXT_PUBLIC_TESTING_MODE=true` in `.env.local`, a floating feedback button appears on **every page** (login, dashboard, etc.). Users can submit:

- Bug reports
- Feature requests
- Improvement suggestions

With optional image/video attachments uploaded to Supabase Storage.

To view feedbacks, run the admin app:

```bash
cd admin
npm install
npm run dev
```

Opens on [http://localhost:3001](http://localhost:3001).
