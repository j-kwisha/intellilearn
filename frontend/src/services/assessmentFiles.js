import api from './api';

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'activity-file';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function assessmentFileFormat(assessment) {
  const source = assessment?.original_filename || assessment?.file_path || assessment?.file_url || '';
  return source.split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || '';
}

export async function downloadAssessmentFile(courseId, assessment) {
  const response = await api.get(`/courses/${courseId}/assessments/${assessment.id}/file/download`, { responseType: 'blob' });
  const extension = assessmentFileFormat(assessment);
  saveBlob(response.data, assessment.original_filename || `${assessment.title || 'activity'}${extension ? `.${extension}` : ''}`);
}

export async function downloadActivitySubmission(courseId, assessmentId, submission) {
  const response = await api.get(`/courses/${courseId}/assessments/${assessmentId}/submissions/${submission.id}/file/download`, { responseType: 'blob' });
  saveBlob(response.data, submission.original_filename || 'completed-activity');
}
