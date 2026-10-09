import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { createAuthSession, getAuthSession } from '../src/services/authSession.js';

function storage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}

test('signing into another tab does not change the instructor token or user, even after reload', () => {
  const shared = storage();
  const instructorStorage = storage();
  const instructor = createAuthSession(instructorStorage, shared);
  instructor.set('instructor-token', { id: 1, role: 'instructor' });
  const student = createAuthSession(storage(), shared);
  student.set('student-token', { id: 2, role: 'student' });
  assert.equal(instructor.getToken(), 'instructor-token');
  assert.equal(instructor.read().user.id, 1);
  const restoredInstructor = createAuthSession(instructorStorage, shared);
  assert.equal(restoredInstructor.getToken(), 'instructor-token');
  assert.equal(restoredInstructor.read().user.id, 1);
  instructor.clear();
  assert.equal(student.getToken(), 'student-token');
  assert.equal(createAuthSession(storage(), shared).getToken(), 'student-token');
  assert.equal(createAuthSession(instructorStorage, shared).getToken(), null);
});

test('late identity responses and logout cannot replace or clear a newer login', () => {
  const session = createAuthSession(storage(), storage());
  session.set('token-a', { id: 1 });
  const old = session.snapshot();
  session.set('token-b', { id: 2 });
  assert.equal(session.updateUser({ id: 1 }, old), false);
  assert.equal(session.clear(old), false);
  assert.equal(session.getToken(), 'token-b');
  assert.equal(session.read().user.id, 2);
  assert.equal(session.updateUser({ id: 1 }, session.snapshot()), false);
  assert.equal(session.read().user.id, 2);
});

test('legacy persistent sign-in is restored once and later shared token changes are ignored', () => {
  const shared = storage();
  shared.setItem('token', 'legacy-token');
  shared.setItem('user', JSON.stringify({ id: 1 }));
  const tab = storage();
  const session = createAuthSession(tab, shared);
  assert.equal(session.getToken(), 'legacy-token');
  shared.setItem('token', 'another-account');
  assert.equal(session.getToken(), 'legacy-token');
  session.clear();
  assert.equal(createAuthSession(tab, shared).getToken(), null);
  assert.equal(shared.getItem('token'), 'another-account');
});

test('normal and incognito storage are independent', () => {
  const normal = createAuthSession(storage(), storage());
  const incognito = createAuthSession(storage(), storage());
  normal.set('instructor-token', { id: 1 });
  incognito.set('student-token', { id: 2 });
  incognito.clear();
  assert.equal(normal.getToken(), 'instructor-token');
  assert.equal(normal.read().user.id, 1);
});

test('real API requests stay bound to this tab; stale successes and 401s cannot affect a newer session', async () => {
  globalThis.sessionStorage = storage();
  globalThis.localStorage = storage();
  const redirects = [];
  globalThis.window = { location: { replace: path => redirects.push(path) } };
  const { default: api } = await import('../src/services/api.js');
  const session = getAuthSession();
  session.set('token-a', { id: 1 });
  const otherTab = createAuthSession(storage(), localStorage);
  otherTab.set('token-b', { id: 2 });
  const first = await api.get('/me', { adapter: async config => {
    assert.equal(config.headers.Authorization, 'Bearer token-a');
    return { data: { user: { id: 1 } }, status: 200, statusText: 'OK', headers: {}, config };
  } });
  assert.equal(first.data.user.id, 1);

  let completeOld;
  const staleSuccess = api.get('/me', { adapter: config => new Promise(resolve => {
    completeOld = () => resolve({ data: { user: { id: 1 } }, status: 200, statusText: 'OK', headers: {}, config });
  }) });
  await new Promise(resolve => setImmediate(resolve));
  session.set('token-c', { id: 3 });
  completeOld();
  await assert.rejects(staleSuccess, axios.isCancel);

  let failOld;
  const staleFailure = api.get('/me', { adapter: config => new Promise((resolve, reject) => {
    failOld = () => reject(new axios.AxiosError('Unauthenticated', 'ERR_BAD_REQUEST', config, {}, { status: 401, config }));
  }) });
  await new Promise(resolve => setImmediate(resolve));
  session.set('token-d', { id: 4 });
  failOld();
  await assert.rejects(staleFailure, axios.isCancel);
  assert.equal(session.getToken(), 'token-d');
  assert.equal(redirects.length, 0);

  await assert.rejects(api.get('/me', { adapter: async config => {
    throw new axios.AxiosError('Unauthenticated', 'ERR_BAD_REQUEST', config, {}, { status: 401, config });
  } }));
  assert.equal(session.getToken(), null);
  assert.deepEqual(redirects, ['/login']);
  assert.equal(otherTab.getToken(), 'token-b');
});
