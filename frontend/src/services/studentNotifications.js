export function notificationId(item) {
  // Keep the frontend compatible while the backend deployment is rolling out.
  return item.id || (item.item_id ? `${item.type}:${item.item_id}`
    : `${item.type}:${item.course_id}:${item.lesson_id || ''}:${item.created_at}:${item.title}`);
}

export function readSeenNotifications(storage, userId) {
  try {
    const value = JSON.parse(storage.getItem(`notif_seen:${userId}`) || '[]');
    return new Set(Array.isArray(value) ? value.filter(id => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

export function markNotificationsSeen(storage, userId, feed, seen) {
  const next = new Set([...seen, ...feed.map(notificationId)]);
  try {
    storage.setItem(`notif_seen:${userId}`, JSON.stringify([...next].slice(-1000)));
  } catch {
    // Keep notifications usable when browser storage is unavailable.
  }
  return next;
}

export function unreadNotifications(feed, seen) {
  return feed.filter(item => !seen.has(notificationId(item))).length;
}

export function notificationPath(item) {
  if (!item.course_id) return '/student';
  const course = `/student/courses/${item.course_id}`;
  if (item.type === 'assessment' && item.item_id) return `${course}/assessments/${item.item_id}`;
  if (item.type === 'material' && item.lesson_id && item.item_id) {
    return `${course}/lessons/${item.lesson_id}/materials/${item.item_id}`;
  }
  return `${course}?tab=${item.type === 'announcement' ? 'announcements' : 'lessons'}`;
}
