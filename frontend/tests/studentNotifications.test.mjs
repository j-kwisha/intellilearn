import test from 'node:test';
import assert from 'node:assert/strict';
import { markNotificationsSeen, notificationId, notificationPath, readSeenNotifications, unreadNotifications } from '../src/services/studentNotifications.js';

function storage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test('a new notification is unread even when it replaces an item in a full 30-item feed', () => {
  const store = storage();
  const feed = Array.from({ length: 30 }, (_, index) => ({ id: `announcement:${index + 1}` }));
  const seen = markNotificationsSeen(store, 1, feed, readSeenNotifications(store, 1));
  assert.equal(unreadNotifications(feed, seen), 0);
  const updated = [{ id: 'announcement:31' }, ...feed.slice(0, 29)];
  assert.equal(updated.length, feed.length);
  assert.equal(unreadNotifications(updated, readSeenNotifications(store, 1)), 1);
  markNotificationsSeen(store, 1, updated, seen);
  assert.equal(unreadNotifications(updated, readSeenNotifications(store, 1)), 0);
});

test('read status is isolated per account and does not use the old shared feed count', () => {
  const store = storage();
  store.setItem('notif_last_seen_count', '30');
  const feed = [{ id: 'assessment:1' }, { id: 'material:1' }];
  assert.equal(unreadNotifications(feed, readSeenNotifications(store, 1)), 2);
  markNotificationsSeen(store, 1, feed, new Set());
  assert.equal(unreadNotifications(feed, readSeenNotifications(store, 1)), 0);
  assert.equal(unreadNotifications(feed, readSeenNotifications(store, 2)), 2);
});

test('invalid or blocked browser storage cannot break the notification panel', () => {
  const store = storage();
  for (const value of ['bad json', '{}', '[1,null,"announcement:1"]']) {
    store.setItem('notif_seen:1', value);
    assert.equal(readSeenNotifications(store, 1).has('announcement:1'), value.startsWith('['));
  }
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(readSeenNotifications(blocked, 1).size, 0);
  assert.equal(markNotificationsSeen(blocked, 1, [{ id: 'material:2' }], new Set()).size, 1);
});

test('notification links open the matching assessment, file, or announcement tab', () => {
  assert.equal(notificationPath({ type: 'assessment', course_id: 12, item_id: 4 }), '/student/courses/12/assessments/4');
  assert.equal(notificationPath({ type: 'material', course_id: 12, lesson_id: 26, item_id: 8 }), '/student/courses/12/lessons/26/materials/8');
  assert.equal(notificationPath({ type: 'announcement', course_id: 12 }), '/student/courses/12?tab=announcements');
  assert.notEqual(notificationId({ type: 'assessment', item_id: 1 }), notificationId({ type: 'material', item_id: 1 }));
  assert.notEqual(notificationId({ type: 'announcement', course_id: 12, created_at: '2026-10-10', title: 'A' }), notificationId({ type: 'announcement', course_id: 12, created_at: '2026-10-10', title: 'B' }));
});
