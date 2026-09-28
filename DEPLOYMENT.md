# IntelliLearn Deployment Guide

## Architecture
- **Frontend** → Vercel
- **Laravel Backend** → Railway (Service 1)
- **Python AI Service** → Railway (Service 2)
- **PostgreSQL** → Railway (Database)

---

## Step 1 — Deploy PostgreSQL on Railway

1. Go to [railway.app](https://railway.app) and create a new project
2. Click **+ New** → **Database** → **PostgreSQL**
3. Once created, click the database → **Variables** tab
4. Copy the `DATABASE_URL` value — you'll need it for Laravel

---

## Step 2 — Deploy Laravel Backend on Railway

1. In the same Railway project, click **+ New** → **GitHub Repo**
2. Select your `intellilearn` repo
3. Set the **Root Directory** to `/` (the repo root)
4. Go to **Variables** and add these:

```
APP_NAME=IntelliLearn
APP_ENV=production
APP_DEBUG=false
APP_KEY=                        ← run: php artisan key:generate --show
APP_URL=https://your-laravel-service.railway.app

DB_CONNECTION=pgsql
DB_HOST=                        ← from Railway PostgreSQL Variables
DB_PORT=5432
DB_DATABASE=                    ← from Railway PostgreSQL Variables
DB_USERNAME=                    ← from Railway PostgreSQL Variables
DB_PASSWORD=                    ← from Railway PostgreSQL Variables

FRONTEND_URL=https://your-app.vercel.app

MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=johannmaier.cuisia@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=johannmaier.cuisia@gmail.com
MAIL_FROM_NAME=IntelliLearn

AI_SERVICE_URL=https://your-ai-service.railway.app

SESSION_DRIVER=database
QUEUE_CONNECTION=database
CACHE_STORE=database
FILESYSTEM_DISK=public
```

5. Railway will auto-detect the `railway.json` and deploy

---

## Step 3 — Deploy Python AI Service on Railway

1. In the same Railway project, click **+ New** → **GitHub Repo**
2. Select the same `intellilearn` repo
3. Set the **Root Directory** to `/ai-service`
4. Go to **Variables** and add:

```
GROQ_API_KEY=your_groq_api_key
```

5. Railway will use `ai-service/railway.json` to start uvicorn

---

## Step 4 — Update Laravel to use Railway AI Service URL

After the AI service deploys, copy its Railway URL and update the Laravel variable:
```
AI_SERVICE_URL=https://your-ai-service.railway.app
```

Then update `app/Http/Controllers/AiController.php`:
```php
private string $aiServiceUrl;

public function __construct() {
    $this->aiServiceUrl = env('AI_SERVICE_URL', 'http://127.0.0.1:8001');
}
```

---

## Step 5 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and import your GitHub repo
2. Set **Root Directory** to `frontend`
3. Framework preset: **Vite**
4. Add this **Environment Variable**:

```
VITE_API_URL=https://your-laravel-service.railway.app/api
```

5. Deploy — Vercel will run `npm run build` automatically

---

## Step 6 — Final checks

After all 3 services are deployed:

1. Visit your Vercel URL → should load the login page
2. Try registering → verification email should arrive
3. Try logging in → should work
4. Test the AI chatbot → should connect to Railway AI service

---

## Updating the app after changes

```bash
git add .
git commit -m "your changes"
git push
```

Railway and Vercel auto-deploy on every push to your main branch.

---

## File storage note

Railway's filesystem is **ephemeral** — uploaded PDFs will be lost on redeploy.
For permanent file storage, use **Cloudflare R2** or **AWS S3** and update `config/filesystems.php`.
This is optional for a thesis demo but required for production.
