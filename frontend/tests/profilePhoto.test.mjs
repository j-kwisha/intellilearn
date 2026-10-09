import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PROFILE_PHOTO_BYTES, profilePhotoError } from '../src/services/profilePhoto.js';

test('profile photos accept only JPG, PNG and WebP, including the inclusive 5 MB limit', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    assert.equal(profilePhotoError({ type, size: 1 }), '');
    assert.equal(profilePhotoError({ type, size: MAX_PROFILE_PHOTO_BYTES }), '');
    assert.match(profilePhotoError({ type, size: MAX_PROFILE_PHOTO_BYTES + 1 }), /5 MB/);
    assert.match(profilePhotoError({ type, size: 0 }), /empty/);
  }
});

test('renaming unsupported files to .jpg does not bypass the frontend type check', () => {
  for (const type of ['image/gif', 'image/svg+xml', 'application/pdf', '', 'text/html']) {
    assert.match(profilePhotoError({ name: 'portrait.jpg', type, size: 100 }), /JPG, PNG, or WebP/);
  }
});
