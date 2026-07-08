# Supabase cloud sync

The app works offline with LocalStorage by default. Supabase is used only for
cloud sync of study data:

- progress
- mistakes
- favorites
- local question overrides and imported questions

The built-in question bank still loads from `public/questions.json`.

## Frontend environment variables

Configure these variables locally and in Vercel:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_your_publishable_key
```

Only use a Supabase publishable or anon key in frontend code. Never put a
`service_role` key in source code or public Vercel environment variables.

## Device sync model

The site does not ask the learner to create an account. Each browser gets a
random device ID and device secret. The database stores only a SHA-256 hash of
the secret and exposes two RPC functions:

- `load_study_state`
- `save_study_state`

Direct table access is revoked from public frontend roles.
