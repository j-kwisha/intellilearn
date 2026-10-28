// Some browsers play VP9 without decoding its alpha channel. Use the static
// avatar in that case instead of showing an opaque rectangle.
export function hasVideoTransparency(video) {
  try {
    if (!video.videoWidth || !video.videoHeight) return false;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return false;
    // Both assistant clips have a transparent top-left corner.
    context.drawImage(video, 0, 0, 1, 1, 0, 0, 1, 1);
    return context.getImageData(0, 0, 1, 1).data[3] < 16;
  } catch {
    return false;
  }
}
