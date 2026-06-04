# Temple Training — Deploy Guide

## One-time setup (~20 minutes)

### 1. Supabase (database)
1. Go to supabase.com → New project (name it "temple-training")
2. Once created, go to **SQL Editor** → paste the contents of `schema.sql` → Run
3. Go to **Settings → API** → copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Push to GitHub
1. Create a new **private** repo on GitHub called `temple-training`
2. In this folder, run:
```
git init
git add .
git commit -m "init"
git remote add origin https://github.com/YOUR_USERNAME/temple-training.git
git push -u origin main
```

### 3. Deploy on Vercel
1. Go to vercel.com → New Project → Import your `temple-training` repo
2. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
   - `APP_PASSWORD` = whatever password you want (just you)
3. Click Deploy

That's it. Your URL will be `temple-training.vercel.app` (or customize it in Vercel settings).

## Local dev
```
cp .env.local.example .env.local
# fill in your values
npm install
npm run dev
# open http://localhost:3000
```

## Adding the Skills tab later
When you're ready, just tell me — I'll add the skills progression tracker as a new tab. The Supabase schema will need one new table, which I'll provide then.
