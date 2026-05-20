# 💪 Workout Tracker — Deployment Guide

A shared workout app for you and your girlfriend. Real-time sync, set-level check-offs, streaks, and stats.

This guide assumes **zero prior deployment experience**. Total time: ~30 minutes. **Cost: $0.**

---

## What you're building

- A website you both visit (something like `will-workouts.vercel.app`)
- Toggle between your profile and hers at the top
- Your check-offs sync to her view in real time, and vice versa
- Works on phone and desktop

---

## What you'll need (all free)

1. A **GitHub** account → https://github.com
2. A **Supabase** account → https://supabase.com (the database)
3. A **Vercel** account → https://vercel.com (the hosting)

Sign up for all three using the same email if you want to keep it simple. Use "Sign in with GitHub" on Supabase and Vercel — it's the easiest.

---

## Step 1 — Set up the database (Supabase)

1. Go to https://supabase.com and click **Start your project** → sign in with GitHub.
2. Click **New project**.
   - Name: `workout-tracker` (anything is fine)
   - Database password: click "Generate a password" and **save it somewhere** (you won't need it often, but keep it)
   - Region: pick whatever is closest to you (e.g. `West US`)
   - Plan: Free
3. Click **Create new project**. Wait ~1 minute for it to set up.

4. Once it loads, click the **SQL Editor** icon on the left sidebar (looks like a database with `</>`).
5. Click **New query**.
6. Open the file `supabase/schema.sql` from this project, copy **all** of it, and paste it into the SQL editor.
7. Click **Run** (bottom right). You should see "Success. No rows returned." That's good.

8. Now grab your project's API keys:
   - Click the **gear icon** (Settings) in the left sidebar → **API**
   - Copy the **Project URL** (looks like `https://abcdefg.supabase.co`) — save it
   - Copy the **anon public** key (a long string starting with `eyJ...`) — save it
   - You'll need both in Step 3.

✅ Database is ready.

---

## Step 2 — Put the code on GitHub

1. Go to https://github.com and sign in.
2. Click the **+** in the top right → **New repository**.
   - Name: `workout-tracker`
   - **Public** is fine (it's just app code, no secrets)
   - **Don't** check any of the "Initialize" boxes
   - Click **Create repository**
3. You'll see a setup page. Look for the section **"…or upload an existing file"** and click that link.
4. Drag and drop ALL the files and folders from this project into the upload area:
   - `app/` (folder)
   - `components/` (folder, if present)
   - `lib/` (folder)
   - `supabase/` (folder)
   - `package.json`
   - `next.config.js`
   - `tailwind.config.js`
   - `postcss.config.js`
   - `.gitignore`
   - `.env.local.example`
   - `README.md` (this file)

   ⚠️ Do **not** upload `.env.local` if it exists. That's where your secret keys go and shouldn't be public.

5. Scroll down, click **Commit changes**.

✅ Code is on GitHub.

---

## Step 3 — Deploy to Vercel

1. Go to https://vercel.com and **Sign up with GitHub**.
2. On the Vercel dashboard, click **Add New… → Project**.
3. You should see your `workout-tracker` repo in the list. Click **Import** next to it.
4. On the next screen ("Configure Project"):
   - Framework Preset: Next.js (should auto-detect)
   - Root Directory: leave as `./`
   - Build / Output settings: leave defaults
5. Expand the **Environment Variables** section. Add **two** variables:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | (paste your Project URL from Step 1) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (paste your anon public key from Step 1) |

6. Click **Deploy**. Wait ~1-2 minutes.

7. When it's done, click **Continue to Dashboard**, then click on your project. You'll see a URL like `workout-tracker-xyz.vercel.app`.

✅ **Your app is live.** Bookmark that URL on both phones.

---

## Step 4 — Customize the names

Right now the two users are "Will" and "Steph". Change Steph to your girlfriend's actual name:

1. Go to your GitHub repo → open `app/page.js`
2. Click the pencil icon (top right of the file) to edit
3. Find this line near the top (around line 8):
   ```js
   { id: 'gf', name: 'Steph' },
   ```
4. Change `'Steph'` to her name. Don't touch the `id`.
5. Scroll down, click **Commit changes**.
6. Vercel will automatically redeploy. Refresh the site in ~30 seconds.

---

## How to use it

- **Top right toggle**: switch between your profile and hers. Check off sets for whichever profile is selected.
- **Workout tab**: today's workout, with set bubbles. Tap a bubble to mark a set done. Each set shows a small letter badge if the other person has also done it.
- **Compare tab**: side-by-side progress bars for every day of the current week.
- **Stats tab**: streaks, total sets, days completed, weekly %.
- **Week arrows**: navigate to past weeks to see history. Future weeks are locked.

---

## Troubleshooting

**The app loads but check-offs don't save / "Syncing..." forever**
→ Your environment variables are probably wrong. Go to Vercel → your project → Settings → Environment Variables. Double-check the URL and key match what's in Supabase (Settings → API). After fixing, go to Deployments → click the latest one → "..." → Redeploy.

**Real-time updates aren't working**
→ Make sure you ran the **full** SQL schema in Step 1, including the last line about `supabase_realtime`.

**I want to change the workout plan exercises**
→ Edit `lib/workoutPlan.js` in GitHub. It auto-redeploys.

**She and I both check off the same set — what happens?**
→ Each user has their own record. You'd both be marked as having done it. Set bubbles show a small letter for the other person if they did it too.

---

## What's next (optional)

- **Custom domain**: in Vercel, go to your project → Settings → Domains. Add something like `ourworkouts.com` if you buy a domain ($10-15/yr).
- **PWA / home screen icon**: on iOS, open the site in Safari, tap the share button, "Add to Home Screen". Now it feels like a real app.

That's it. Have fun crushing it together. 🏋️
