# Database Setup & Management

## SQL Scripts

All SQL files are in `supabase/`. Run them in **Supabase SQL Editor** (Dashboard → SQL Editor).

### Order of Execution

#### First Time Setup (new Supabase project)

| Step | Script | What it does | When to run |
|------|--------|-------------|-------------|
| 1 | `fix-permissions.sql` | Grants `usage` on `public` schema to `anon`, `authenticated`, `service_role` | **Once** — run before anything else on a fresh project |
| 2 | `schema.sql` | Creates all tables, enums, indexes, functions, triggers | **Once** — creates the database structure |
| 3 | `rls.sql` | Enables Row Level Security and creates all policies | **Once** — enforces multi-org data isolation |
| 4 | `seed.sql` | Seeds 2 organizations, 5 contacts, 2 articles | **Once** — populates initial demo data |
| 5 | Create users | In Supabase Dashboard → Authentication → Users → Add user | **Once** per user |
| 6 | `assign-users.sql` | Assigns users to organizations via `user_organizations` | **After** creating each user |

#### Re-running / Resetting

If you need to reset everything:

1. Run `schema.sql` — it drops all tables/enums/functions first, then recreates them
2. Run `rls.sql` — recreates all RLS policies
3. Run `seed.sql` — deletes old seed data and re-inserts fresh data
4. Re-create users in Auth Dashboard
5. Run `assign-users.sql` — re-assigns users to orgs

**Note:** Re-running `schema.sql` will delete ALL data including users' assignments.

#### Adding a New User

1. Create user in **Supabase Dashboard → Authentication → Users**
2. Run `assign-users.sql` (update the email if needed)

---

## Credentials (after seed)

| Email | Password | Role | Access |
|-------|----------|------|--------|
| `adam@gmail.com` | `adam123` | user | Org A only |
| `admin@gmail.com` | `admin123` | admin | Org A + Org B |

**Change these passwords after first login.**

---

## Troubleshooting

### "permission denied for schema public"
Run `fix-permissions.sql`. This happens when `create schema if not exists public` resets permissions.

### "duplicate key value violates unique constraint"
Users already exist in `auth.users`. Delete them first (SQL Editor):
```sql
delete from user_organizations where user_id in (select id from auth.users where email = 'your@email.com');
delete from profiles where id in (select id from auth.users where email = 'your@email.com');
delete from auth.users where email = 'your@email.com';
```

### Login returns 500 error
User was inserted directly into `auth.users` instead of through the Supabase API. Delete and re-create via Dashboard → Auth → Users.

### Dashboard shows empty / no data
User has no org assignments. Run `assign-users.sql` or check `user_organizations` table.
