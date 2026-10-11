export function materialFormat(material) {
  if (material.type === 'link') return 'link';
  const path = (material.original_filename || material.file_path || material.file_url || '').split(/[?#]/)[0];
  const extension = path.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  return ['pdf', 'doc', 'docx', 'ppt', 'pptx'].includes(extension) ? extension : material.type;
}

export function materialPreviewUrl(material) {
  const url = material.file_url || material.url;
  if (!url) return null;
  return ['doc', 'docx', 'ppt', 'pptx'].includes(materialFormat(material))
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
    : url;
}
