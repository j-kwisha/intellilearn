import api from './api';

export async function downloadMaterial(courseId, lessonId, material) {
  const response = await api.get(`/courses/${courseId}/lessons/${lessonId}/materials/${material.id}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = material.download_name || material.original_filename || material.title;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
