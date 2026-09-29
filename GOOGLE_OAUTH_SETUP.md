# Google OAuth Setup Guide

This guide will walk you through setting up Google OAuth authentication for IntelliLearn.

## Overview

IntelliLearn now supports Google OAuth authentication, allowing users to sign up and log in using their Google accounts. This feature:

- ✅ Allows users to authenticate without creating a password
- ✅ Automatically creates user accounts on first Google login
- ✅ Supports linking existing accounts to Google
- ✅ Stores user profile pictures from Google
- ✅ Works seamlessly with existing email/password authentication

## Prerequisites

- Google Cloud Console account
- Access to your backend `.env` file
- Access to your frontend `.env` file

---

## Part 1: Google Cloud Console Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click **"New Project"**
4. Enter project name: `IntelliLearn` (or your preferred name)
5. Click **"Create"**

### Step 2: Enable Google+ API

1. In your project dashboard, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google+ API"**
3. Click on it and press **"Enable"**

### Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** user type (or **"Internal"** if using Google Workspace)
3. Click **"Create"**

#### Fill in the required information:

**App Information:**
- App name: `IntelliLearn`
- User support email: Your email address
- App logo: (Optional) Upload your logo

**App Domain:**
- Application home page: `https://your-frontend-domain.vercel.app`
- Application privacy policy link: `https://your-frontend-domain.vercel.app/privacy`
- Application terms of service link: `https://your-frontend-domain.vercel.app/terms`

**Authorized Domains:**
- Add your frontend domain (e.g., `your-frontend-domain.vercel.app`)
- Add your backend domain (e.g., `your-backend-domain.railway.app`)

**Developer Contact Information:**
- Enter your email address

4. Click **"Save and Continue"**

#### Scopes:

1. Click **"Add or Remove Scopes"**
2. Add these scopes:
   - `userinfo.email`
   - `userinfo.profile`
   - `openid`
3. Click **"Update"** then **"Save and Continue"**

#### Test Users (for development):

1. Click **"Add Users"**
2. Add email addresses of people who will test the app
3. Click **"Save and Continue"**

### Step 4: Create OAuth Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Select **"Web application"**

**Configure the OAuth Client:**

- **Name:** `IntelliLearn Web Client`

- **Authorized JavaScript origins:**
  ```
  http://localhost:5173
  https://your-frontend-domain.vercel.app
  ```

- **Authorized redirect URIs:**
  ```
  http://localhost:5173/auth/google/callback
  https://your-frontend-domain.vercel.app/auth/google/callback
  ```

4. Click **"Create"**
5. **Copy your Client ID and Client Secret** — you'll need these next!

---

## Part 2: Backend Configuration (Laravel)

### Step 1: Update Environment Variables

Add the following to your backend `.env` file:

```env
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_REDIRECT_URI="${APP_URL}/auth/google/callback"
```

**Replace:**
- `your-google-client-id-here` with your actual Google Client ID
- `your-google-client-secret-here` with your actual Google Client Secret

### Step 2: Run Database Migration

Run the migration to add Google OAuth columns to the users table:

```bash
php artisan migrate
```

This will add:
- `google_id` column (for storing Google user ID)
- `avatar` column (for storing profile picture URL)
- Make `password` column nullable (to allow OAuth-only users)

### Step 3: Update Railway Environment Variables

If deploying on Railway:

1. Go to your Railway project
2. Navigate to **Variables** tab
3. Add:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` (use your production URL)

---

## Part 3: Frontend Configuration (React)

Your frontend `.env` file should already have:

```env
VITE_API_URL=http://localhost:8000
```

For production (Vercel), ensure the environment variable points to your Railway backend:

```env
VITE_API_URL=https://your-backend-domain.railway.app
```

No additional configuration needed — the frontend is ready!

---

## How It Works

### User Flow

1. **User clicks "Sign in with Google"** on Login or Register page
2. Frontend calls `/api/auth/google/redirect` endpoint
3. Backend returns Google OAuth URL
4. User is redirected to Google's login page
5. User authenticates with Google and grants permissions
6. Google redirects back to `/auth/google/callback` with authorization code
7. Backend exchanges code for user info and creates/updates user account
8. Backend returns JWT token and user data
9. Frontend stores token and redirects based on user role:
   - Admin → `/admin`
   - Instructor → `/instructor`
   - Student → `/student`

### Backend Endpoints

**Public Routes:**
- `GET /api/auth/google/redirect` - Returns Google OAuth URL
- `GET /api/auth/google/callback` - Handles OAuth callback, returns token

**Protected Routes (for existing users):**
- `POST /api/auth/google/link` - Link Google account to existing account
- `POST /api/auth/google/unlink` - Unlink Google account

### Database Schema

New columns added to `users` table:

```sql
google_id VARCHAR(255) NULLABLE UNIQUE
avatar VARCHAR(255) NULLABLE
password VARCHAR(255) NULLABLE (changed from NOT NULL)
```

---

## Testing

### Local Testing

1. Start your backend server:
   ```bash
   php artisan serve
   ```

2. Start your frontend server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Navigate to `http://localhost:5173/login`
4. Click **"Sign in with Google"**
5. Authenticate with a Google account (must be in test users list)
6. Verify you're redirected to the appropriate dashboard

### Production Testing

1. Deploy both frontend and backend
2. Update Google OAuth redirect URIs with production URLs
3. Test the complete flow on production

---

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Cause:** The redirect URI in your request doesn't match any authorized redirect URIs in Google Console.

**Solution:**
1. Check your `GOOGLE_REDIRECT_URI` in `.env`
2. Ensure it matches exactly in Google Console credentials
3. Include both `http://localhost:5173/auth/google/callback` AND your production URL

### Error: "Access blocked: Authorization Error"

**Cause:** App is in testing mode and user is not in test users list.

**Solution:**
1. Add the user's email to test users in OAuth consent screen
2. OR publish your app (requires verification for sensitive scopes)

### Error: "Invalid token" or "Unauthenticated"

**Cause:** JWT token not properly stored or expired.

**Solution:**
1. Check browser console for errors
2. Verify token is stored in localStorage
3. Check backend logs for authentication errors

### Users Can't Login After Google Auth

**Cause:** Password field is required but user has no password (OAuth-only).

**Solution:**
- Migration makes password nullable
- Run migration: `php artisan migrate`
- Check database schema to confirm password is nullable

---

## Security Best Practices

1. **Never commit credentials:**
   - `.env` files are in `.gitignore`
   - Never share Client Secret publicly

2. **Use HTTPS in production:**
   - Google OAuth requires HTTPS for production URLs
   - Vercel and Railway provide HTTPS by default

3. **Validate OAuth state:**
   - Laravel Socialite handles state validation automatically
   - Don't disable CSRF protection

4. **Limit scope requests:**
   - Only request `email` and `profile` scopes
   - Don't request unnecessary permissions

5. **Rotate credentials:**
   - Regenerate Client Secret if compromised
   - Update environment variables immediately

---

## Additional Features

### Linking Google to Existing Account

Users with existing email/password accounts can link their Google account:

```javascript
// Frontend example
const linkGoogle = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/auth/google/link`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await response.json();
  // Redirect to data.url
  window.location.href = data.url;
};
```

### Unlinking Google Account

```javascript
// Frontend example
const unlinkGoogle = async () => {
  const token = localStorage.getItem('token');
  await fetch(`${API_URL}/api/auth/google/unlink`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};
```

---

## Support

If you encounter issues not covered in this guide:

1. Check Laravel logs: `storage/logs/laravel.log`
2. Check browser console for frontend errors
3. Verify all environment variables are set correctly
4. Ensure Google Cloud project is properly configured

---

## Resources

- [Laravel Socialite Documentation](https://laravel.com/docs/socialite)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)

---

**Last Updated:** September 29, 2026
**IntelliLearn Version:** 1.0.0
