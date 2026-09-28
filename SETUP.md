# Intellilearn Setup Guide

Complete step-by-step guide to set up Intellilearn on a new machine.

## Prerequisites

Install the following software before proceeding:

### 1. PHP 8.3 or higher
- **Windows**: Download from [windows.php.net](https://windows.php.net/download/)
  - Get the "Thread Safe" ZIP version
  - Extract to `C:\php`
  - Add `C:\php` to your system PATH
  - Enable required extensions in `php.ini`:
    ```ini
    extension=pdo_sqlite
    extension=sqlite3
    extension=mbstring
    extension=openssl
    extension=fileinfo
    ```

### 2. Composer
- Download from [getcomposer.org](https://getcomposer.org/download/)
- Run the installer (it will detect your PHP installation)

### 3. Node.js 18+ and npm
- Download from [nodejs.org](https://nodejs.org/)
- Choose the LTS version
- Verify installation:
  ```bash
  node --version
  npm --version
  ```

### 4. Git
- Download from [git-scm.com](https://git-scm.com/)
- Use default installation options

---

## Installation Steps

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd intellilearn
```

### Step 2: Backend Setup (Laravel)

1. **Install PHP dependencies:**
   ```bash
   composer install
   ```

2. **Create environment file:**
   ```bash
   copy .env.example .env
   ```

3. **Generate application key:**
   ```bash
   php artisan key:generate
   ```

4. **Create database:**
   ```bash
   php artisan migrate
   ```

5. **Seed the database (optional):**
   ```bash
   php artisan db:seed
   ```

6. **Install Node dependencies for Laravel:**
   ```bash
   npm install
   ```

### Step 3: Frontend Setup (React)

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Go back to root:**
   ```bash
   cd ..
   ```

---

## Running the Application

You need to run both the backend and frontend servers.

### Option 1: Run Separately (Recommended for Development)

**Terminal 1 - Laravel Backend:**
```bash
php artisan serve
```
Backend will run at: `http://localhost:8000`

**Terminal 2 - React Frontend:**
```bash
cd frontend
npm run dev
```
Frontend will run at: `http://localhost:5173`

### Option 2: Run with Concurrently (Single Command)

From the root directory:
```bash
npm run dev
```

This will start:
- Laravel server (port 8000)
- Queue worker
- Log viewer
- Vite dev server

---

## Accessing the Application

1. Open your browser and go to: `http://localhost:5173`
2. The React app will communicate with the Laravel API at `http://localhost:8000`

### Default Login Credentials

If you ran the database seeder, you can use these accounts:

**Admin:**
- Email: `admin@demo.com`
- Password: `password`

**Instructor:**
- Email: `instructor@demo.com`
- Password: `password`

**Student:**
- Email: `student1@demo.com`
- Password: `password`

---

## Troubleshooting

### "vite is not recognized"
Run `npm install` in the root directory.

### "Class not found" errors
Run `composer dump-autoload`

### Database errors
- Make sure `database/database.sqlite` exists
- Run `php artisan migrate:fresh` to reset the database

### Port already in use
- Laravel: Change port with `php artisan serve --port=8001`
- React: Vite will automatically try the next available port

### CORS errors
Check that your frontend is making requests to `http://localhost:8000/api`

---

## Production Build

### Build Frontend:
```bash
cd frontend
npm run build
```

### Optimize Laravel:
```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## Additional Commands

### Clear all caches:
```bash
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

### Run tests:
```bash
php artisan test
```

### Code formatting:
```bash
composer pint
```

---

## Tech Stack

- **Backend**: Laravel 13, PHP 8.3, SQLite
- **Frontend**: React 19, Vite 8, Material-UI, TailwindCSS
- **Authentication**: Laravel Sanctum
