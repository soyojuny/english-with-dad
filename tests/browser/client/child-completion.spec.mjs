import assert from 'node:assert/strict';
import { test, expect } from '../support/client-fixture.mjs';

test.describe.configure({ timeout: 15_000 });

async function selectChild(page, name) { await page.locator('.profile-grid').getByRole('button', { name: new RegExp(name) }).click(); }
async function selectAssignment(page, title) { await page.locator('.assignment-card').filter({ hasText: title }).click(); }
function taskFeedback(page, label) { return page.locator('.task-row').filter({ has: page.getByRole('heading', { name: label, exact: true }) }).locator('..').locator('.return-box'); }
function completionWrites(fixture) { return fixture.writes('completions').map((request) => request.body); }

for (const { id, title, task, minutes, assignmentId, taskType, audio } of [
  { id: 'U05-N01', title: '다섯 활동 책', task: '읽기', minutes: 10, assignmentId: 'assignment-main', taskType: 'listen', audio: true },
  { id: 'U05-N02', title: '다섯 활동 책', task: '정따', minutes: 10, assignmentId: 'assignment-main', taskType: 'shadow', audio: true },
  { id: 'U05-N03', title: '다섯 활동 책', task: '스스로 읽기', minutes: 5, assignmentId: 'assignment-main', taskType: 'self', audio: false },
  { id: 'U05-N04', title: '단어 자료', task: '단어 읽기', minutes: 5, assignmentId: 'assignment-word', taskType: 'wordRead', audio: true },
  { id: 'U05-N05', title: '필사 책', task: '필사', minutes: 5, assignmentId: 'assignment-copy', taskType: 'copywork', audio: false },
]) {
  test(`${id} 정상: ${task} 수동 완료는 reachable assignment의 1회와 ${minutes}분을 저장한다`, async ({ childCompletion: f }) => {
    // Given
    await selectChild(f.page, '민준');
    await selectAssignment(f.page, title);

    // When
    await taskFeedback(f.page, task).getByRole('button', { name: '1회 완료', exact: true }).click();
    await expect.poll(() => completionWrites(f).length).toBe(1);

    // Then
    assert.deepEqual(completionWrites(f)[0], { owner_user_id: 'owner-1', assignment_id: assignmentId, task_type: taskType, completed_at: '2026-10-17T15:00:00.000Z', minutes, audio_opened_at: audio ? '2026-10-17T14:50:00.000Z' : null, count: 1 });
  });
}

test('U05-E01 경계: 2회 목표 읽기는 두 번째 저장 뒤 추가 완료 control을 표시하지 않는다', async ({ childCompletion: f }) => {
  // Given
  await selectChild(f.page, '민준'); await selectAssignment(f.page, '다섯 활동 책');
  const feedback = taskFeedback(f.page, '읽기');
  // When
  await feedback.getByRole('button', { name: '1회 완료', exact: true }).click();
  await feedback.getByRole('button', { name: '2회 완료', exact: true }).click();
  await expect.poll(() => completionWrites(f).length).toBe(2);
  // Then
  assert.equal(completionWrites(f)[1].count, 2);
  await expect(feedback.getByRole('button', { name: '3회 완료', exact: true })).toHaveCount(0);
  await expect(f.page.locator('.status-row')).toContainText('읽기 2/2회');
});

for (const score of ['PASS', 'FAIL']) {
  test(`U05-N0${score === 'PASS' ? '6' : '7'} 정상: 퀴즈 ${score}는 독립 owner 범위 PATCH와 선택 상태를 만든다`, async ({ childCompletion: f }) => {
    // Given
    await selectChild(f.page, '민준'); await selectAssignment(f.page, '다섯 활동 책');
    const quiz = f.page.getByRole('group', { name: '퀴즈 결과 선택' });
    // When
    await quiz.getByRole('button', { name: score, exact: true }).click();
    // Then
    const write = f.writes('assignments')[0];
    assert.deepEqual(write.body, { quiz_score: score });
    assert.equal(new URLSearchParams(write.query).get('owner_user_id'), 'eq.owner-1');
    assert.equal(new URLSearchParams(write.query).get('id'), 'eq.assignment-main');
    await expect(quiz.getByRole('button', { name: score, exact: true })).toHaveClass(/primary-button/);
  });
}

test('U05-E02 경계: 선택은 reload에 복원되고 다른 아동 scope의 선택과 과제는 섞이지 않는다', async ({ childCompletion: f }) => {
  // Given
  await selectChild(f.page, '민준'); await selectAssignment(f.page, '선택 복원 책');
  // When
  await f.page.reload();
  await expect(f.page.locator('.assignment-card.is-active').filter({ hasText: '선택 복원 책' })).toBeVisible();
  await f.page.getByRole('button', { name: '프로필 관리', exact: true }).click(); await selectChild(f.page, '서준');
  // Then
  await expect(f.page.locator('.assignment-card')).toHaveCount(1);
  await expect(f.page.locator('.assignment-card')).toContainText('서준의 책');
  await expect(f.page.locator('.assignment-card')).not.toContainText('선택 복원 책');
  await f.page.getByRole('button', { name: '프로필 관리', exact: true }).click(); await selectChild(f.page, '민준');
  await expect(f.page.locator('.assignment-card.is-active').filter({ hasText: '선택 복원 책' })).toBeVisible();
});

test('U05-F01 잘못된 상태: 오디오 launch 전에는 audio task 완료 control이 없다', async ({ childCompletion: f }) => {
  // Given
  await selectChild(f.page, '민준'); await selectAssignment(f.page, '미실행 오디오 책');
  // When
  const feedback = taskFeedback(f.page, '읽기');
  // Then
  await expect(feedback).toHaveCount(0);
  assert.equal(completionWrites(f).length, 0);
});

test('U06-N01 정상: 첫 복귀 시간은 한 번 저장되고 launch/복귀만으로는 완료하지 않는다', async ({ childCompletion: f }) => {
  // Given
  await selectChild(f.page, '민준'); await selectAssignment(f.page, '다섯 활동 책');
  // When
  await f.page.getByRole('button', { name: '오디오 열기', exact: true }).first().click();
  // window.open follows launch persistence and coordinator registration; depart only after it runs.
  await expect.poll(async () => (await f.popupCalls()).length).toBe(1);
  await f.page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await f.page.clock.fastForward(60_001);
  const firstReturnResponse = f.page.waitForResponse(response => response.url().includes('/rest/v1/audio_launches') && response.request().method() === 'PATCH');
  await f.page.evaluate(() => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('focus')); });
  await (await firstReturnResponse).finished();
  await expect.poll(() => f.writes('audio_launches').filter(write => write.method === 'PATCH' && new URLSearchParams(write.query).get('task_type') === 'eq.listen').length).toBe(1);
  // Then
  assert.equal((await f.popupCalls()).length, 1);
  const listenReturns = f.writes('audio_launches').filter(write => write.method === 'PATCH' && new URLSearchParams(write.query).get('task_type') === 'eq.listen');
  assert.equal(listenReturns.length, 1);
  assert.deepEqual(listenReturns[0].body, { returned_at: '2026-10-17T15:01:00.001Z' });
  const persistedReturn = f.launches.find(launch => launch.assignment_id === 'assignment-main' && launch.task_type === 'listen');
  assert.equal(persistedReturn?.returned_at, '2026-10-17T15:01:00.001Z');
  await expect(f.page.getByRole('alert')).toHaveCount(0);
  await expect(taskFeedback(f.page, '읽기').getByRole('button', { name: '복귀 시간 다시 저장', exact: true })).toHaveCount(0);
  assert.equal(completionWrites(f).length, 0);
  await f.page.reload();
  await expect(f.page.locator('.assignment-card.is-active').filter({ hasText: '다섯 활동 책' })).toBeVisible();
  await expect(taskFeedback(f.page, '읽기')).toContainText('앱으로 돌아온 시간');
  await taskFeedback(f.page, '읽기').getByRole('button', { name: '1회 완료', exact: true }).click();
  await expect.poll(() => completionWrites(f).length).toBe(1);
  assert.equal(completionWrites(f)[0].minutes, 2);
});

test('U06-E01 경계: 첫 복귀 저장이 끝난 뒤의 두 번째 blur/focus는 return과 완료 시간을 바꾸지 않는다', async ({ childCompletion: f }) => {
  // Given
  await selectChild(f.page, '민준'); await selectAssignment(f.page, '다섯 활동 책');
  await f.page.getByRole('button', { name: '오디오 열기', exact: true }).first().click();
  // Match a real departure after the persisted launch has been applied, rather than after click dispatch.
  await expect.poll(async () => (await f.popupCalls()).length).toBe(1);
  await f.page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await f.page.clock.fastForward(60_001);
  const firstReturnResponse = f.page.waitForResponse(response => response.url().includes('/rest/v1/audio_launches') && response.request().method() === 'PATCH');
  await f.page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await (await firstReturnResponse).finished();
  await expect.poll(() => f.writes('audio_launches').filter(write => write.method === 'PATCH' && new URLSearchParams(write.query).get('task_type') === 'eq.listen').length).toBe(1);
  await expect(taskFeedback(f.page, '읽기')).toContainText('앱으로 돌아온 시간');
  const firstReturn = f.launches.find(launch => launch.assignment_id === 'assignment-main' && launch.task_type === 'listen')?.returned_at;

  // When
  await f.page.clock.fastForward(60_000);
  await f.page.evaluate(() => { window.dispatchEvent(new Event('blur')); window.dispatchEvent(new Event('focus')); });

  // Then
  assert.equal(f.writes('audio_launches').filter(write => write.method === 'PATCH' && new URLSearchParams(write.query).get('task_type') === 'eq.listen').length, 1);
  assert.equal(f.launches.find(launch => launch.assignment_id === 'assignment-main' && launch.task_type === 'listen')?.returned_at, firstReturn);
  await taskFeedback(f.page, '읽기').getByRole('button', { name: '1회 완료', exact: true }).click();
  await expect.poll(() => completionWrites(f).length).toBe(1);
  assert.equal(completionWrites(f)[0].minutes, 2);
});

test('U06-F01 실패: popup 차단은 현재 계약대로 launch 저장 뒤 안내를 표시하고 자동 완료하지 않는다', async ({ childCompletion: f }) => {
  // Given
  await selectChild(f.page, '민준'); await selectAssignment(f.page, '다섯 활동 책'); await f.popupAllowed(false);
  // When
  await f.page.getByRole('button', { name: '오디오 열기', exact: true }).first().click();
  // Then
  await expect(f.page.getByText('브라우저가 새 창 열기를 막았습니다. 링크를 직접 열어 주세요.')).toBeVisible();
  assert.equal((await f.popupCalls()).length, 1);
  assert.equal(f.writes('audio_launches').length, 1);
  assert.equal(completionWrites(f).length, 0);
});

test('U07-F01 실패: 응답 유실 뒤 결과 조회가 실패해도 재확인으로 복구하며 완료를 다시 쓰지 않는다', async ({ childCompletion: f }) => {
  // Given
  await selectChild(f.page, '민준'); await selectAssignment(f.page, '다섯 활동 책'); f.loseCompletionResponse();
  const feedback = taskFeedback(f.page, '읽기');

  // When
  await feedback.getByRole('button', { name: '1회 완료', exact: true }).click();
  await feedback.getByRole('button', { name: '저장 결과 확인', exact: true }).waitFor();
  f.failNextCompletionCheck();
  const failedCheckResponse = f.page.waitForResponse(response => response.url().includes('/rest/v1/completions') && response.request().method() === 'GET' && response.status() === 400);
  await feedback.getByRole('button', { name: '저장 결과 확인', exact: true }).click();
  await (await failedCheckResponse).finished();
  await expect(feedback).toContainText('완료 기록을 조회하지 못했습니다. 결과 확인을 다시 시도하세요.');

  // Then
  assert.equal(completionWrites(f).length, 1);
  assert.equal(f.completions.length, 1);
  assert.equal(f.requests.filter(request => request.path === '/rest/v1/completions' && request.method === 'GET').length, 1);
  await expect(feedback.getByRole('button', { name: '저장 결과 확인', exact: true })).toBeVisible();
  await expect(feedback.getByRole('button', { name: '같은 요청 재시도', exact: true })).toBeVisible();
  await feedback.getByRole('button', { name: '저장 결과 확인', exact: true }).click();
  await expect(feedback.getByRole('button', { name: '2회 완료', exact: true })).toBeVisible();
  assert.equal(completionWrites(f).length, 1);
});

test('H03-E01 경계: child를 왕복한 뒤 늦게 도착한 이전 완료 응답은 새 snapshot을 덮어쓰지 않는다', async ({ childCompletion: f }) => {
  // Given
  await selectChild(f.page, '민준'); await selectAssignment(f.page, '다섯 활동 책'); f.holdCompletion();
  await taskFeedback(f.page, '스스로 읽기').getByRole('button', { name: '1회 완료', exact: true }).click();
  await expect.poll(() => f.writes('completions').length).toBe(1);

  // When
  await f.page.getByRole('button', { name: '프로필 관리', exact: true }).click(); await selectChild(f.page, '서준');
  await f.page.getByRole('button', { name: '프로필 관리', exact: true }).click(); await selectChild(f.page, '민준');
  await expect(f.page.locator('.status-row')).toContainText('스스로 읽기 0/1회');
  const oldResponse = f.page.waitForResponse(response => response.url().includes('/rest/v1/completions') && response.request().method() === 'POST');
  f.releaseCompletion();
  await (await oldResponse).finished();
  await f.page.clock.fastForward(16);

  // Then
  await expect(f.page.locator('.status-row')).toContainText('스스로 읽기 0/1회');
  assert.equal(completionWrites(f)[0].assignment_id, 'assignment-main');
  await f.page.reload();
  await expect(f.page.locator('.status-row')).toContainText('스스로 읽기 1/1회');
});
