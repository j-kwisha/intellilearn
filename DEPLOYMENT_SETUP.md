# IntelliLearn Deployment Setup

## Why Features Aren't Showing on Live Server

**Problem**: Frontend (Vercel) and Backend (Railway) aren't connected properly. The frontend can't communicate with the backend API.

**Solution**: Set the `VITE_API_URL` environment variable in Vercel to point to your Railway backend.

---

## Deployment Architecture

```
┌─────────────────────────────────────┐
│         Vercel (Frontend)           │
│  - React UI                         │
│  - Vite build                       │
│  - Calls /api/* endpoints           │
└────────────────┬────────────────────┘
                 │
                 │ VITE_API_URL
                 │ (HTTP Request)
                 ▼
┌─────────────────────────────────────┐
│        Railway (Backend)            │
│  - Laravel API                      │
│  - PostgreSQL Database              │
│  - All matching question logic      │
└─────────────────────────────────────┘
```

---

## Step 1: Find Your Railway Backend URL

1. Go to [railway.app](https://railway.app)
2. Select your project
3. Click on the backend service
4. Copy the **public URL** (looks like `https://your-app-xxxx.railway.app`)

Example: `https://intellilearn-backend-prod.railway.app`

---

## Step 2: Set Environment Variable in Vercel

1. Go to [vercel.com](https://vercel.com)
2. Select your IntelliLearn project
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-railway-backend.railway.app` (replace with actual URL)
   - **Environments**: Production, Preview, Development
5. Click **Save**

---

## Step 3: Redeploy on Vercel

After setting the environment variable, you need to redeploy:

1. Go to **Deployments** tab
2. Click the three dots on the latest deployment
3. Click **Redeploy**

Or trigger a redeploy by pushing a commit to main:
```bash
git commit --allow-empty -m "trigger: Redeploy with updated environment variables"
git push origin main
```

---

## Step 4: Verify the Connection

Once redeployed, test the connection:

1. Open your Vercel frontend in browser
2. Open **Developer Console** (F12)
3. Look for any errors in the Console
4. Check the **Network** tab to see if API calls are reaching the backend
5. Look for requests to your Railway backend URL

Expected API requests should go to:
```
https://your-railway-backend.railway.app/api/courses
https://your-railway-backend.railway.app/api/assessments
```

---

## What Gets Deployed

### Frontend (Vercel)
- ✅ React components (StudentQuizPage, InstructorCreateAssessmentPage, etc.)
- ✅ Matching question UI
- ✅ Grade reporting pages
- ✅ Analytics dashboards

### Backend (Railway)
- ✅ Laravel API endpoints
- ✅ Matching question auto-grading logic
- ✅ Database migrations (matching_pairs table)
- ✅ Essay grading with rubrics
- ✅ Score visibility enforcement
- ✅ Course materials upload

---

## Current Deployment Status

### Last Commits (all now on GitHub)
```
ed43689 - config: Add Vercel configuration
3ff119e - fix: Close template literal properly
0d7e082 - fix: Remove invalid escape sequences
faec61f - fix: Suppress sklearn warnings
e2f04d5 - feat: Complete matching question type implementation
```

### What's Ready to Deploy
- ✅ Matching question type (backend + frontend)
- ✅ Auto-grading with proportional scoring
- ✅ Course materials support
- ✅ Essay rubric system
- ✅ Score visibility controls
- ✅ Student grades dashboard
- ✅ Instructor analytics

---

## Troubleshooting

### "API calls fail with 404 or CORS errors"
→ Check that `VITE_API_URL` is set correctly in Vercel

### "Frontend loads but features don't work"
→ The frontend is running but can't reach the backend. Set `VITE_API_URL` environment variable.

### "Vercel build still fails"
→ Check build logs in Vercel dashboard. Recent fixes should have resolved template literal errors.

### "Railway backend isn't responding"
→ Check Railway dashboard to ensure backend service is running. Check logs for errors.

---

## Next Steps

1. ✅ Push code to GitHub (DONE)
2. 🔲 Set `VITE_API_URL` in Vercel environment variables
3. 🔲 Redeploy on Vercel
4. 🔲 Test frontend → backend connection
5. 🔲 Verify matching questions work end-to-end

Once these steps are complete, your live server will have all the matching question features!
