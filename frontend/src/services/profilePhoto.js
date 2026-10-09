export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
export function profilePhotoError(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Choose a JPG, PNG, or WebP image.';
  if (!file.size) return 'The selected image is empty.';
  if (file.size > MAX_PROFILE_PHOTO_BYTES) return 'Your photo must be 5 MB or smaller.';
  return '';
}
