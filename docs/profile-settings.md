# Profile settings and photos

Student and instructor profiles use the shared profile settings page. Edit Profile
lets users preview, upload, replace or remove a photo. Changes are applied only
when Save Changes succeeds; Cancel discards the draft. Account name/photo updates
also update the current tab's header and sidebar without changing its login.

## API and storage

- Existing `PUT /api/profile` accepts `first_name`, `last_name`, `email`, an optional
  `avatar` file, or `remove_avatar=1`. Upload and removal cannot be requested together.
- The browser sends multipart `POST /api/profile` with `_method=PUT` so PHP parses
  the upload and Laravel dispatches the existing authenticated PUT route.
- Only JPG, PNG and WebP images up to 5 MiB (5,242,880 bytes) are accepted. The
  backend checks MIME/content and readable image dimensions, not the filename alone.
- Files use the existing `public` disk at
  `storage/app/public/avatars/user_{id}/`. The existing `users.avatar` column stores
  the public URL, returned by the profile update, `/api/me` and login responses.
- Replacing/removing a photo deletes only that account's previous local upload,
  after the database update succeeds. Google-hosted images are never deleted.
- A storage/save failure preserves the previous profile and returns a generic
  retry message. Logs contain account ID and exception class, without image data,
  credentials or provider exception messages.

## Deployment requirements

No migrations or new environment variables are required. Keep the existing
`APP_URL` set to the backend's HTTPS origin and preserve the public storage volume.

Railway's backend public disk was verified as a mounted persistent volume at
`/app/storage/app/public`; `/app/public/storage` points to that directory. This
allows uploaded photos to survive logout, refresh and container redeployment.
The existing backend startup script creates the link. For local setup or another
deployment with a missing link, run:

```sh
php artisan storage:link
```

On any replacement infrastructure, mount persistent storage at
`/app/storage/app/public` before starting the backend. Do not seed, clear, or
replace this directory to deploy profile changes.

## Verification

`tests/Feature/ProfileSettingsTest.php` covers real JPG/PNG/WebP uploads, persistent
avatar retrieval, replacement/removal, ownership, unchanged avatars on name-only
updates, invalid/spoofed/oversized files, the inclusive size limit, storage failure,
authentication and password validation. Frontend photo checks have matching tests
in `frontend/tests/profilePhoto.test.mjs`.

Manual smoke test: edit a profile, select a photo, inspect its preview, save,
refresh and sign in again. Verify the photo remains in the profile/header/sidebar.
Replace it, then remove it and save; initials should return. Cancel must leave the
saved photo unchanged. Check password field visibility toggles and Google linking
without changing the existing account email.
