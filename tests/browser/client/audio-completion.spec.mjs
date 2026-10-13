import assert from 'node:assert/strict';
import { test, expect } from '../support/client-fixture.mjs';

test('selection-reload', async ({ audio: f }) => {
    // Given: isolated child/assignment HTTP fixture with no completions.
    // When
    await f.page.reload();
    // Then
    await f.page.locator('.assignment-card.is-active').filter({hasText:'테스트 책 2'}).waitFor({timeout:4000});
    await f.page.getByRole('button',{name:'1회 완료',exact:true}).waitFor({timeout:4000});
  });
test('saving-status', async ({ audio: f }) => {
    // Given: isolated child/assignment HTTP fixture with no completions.
    f.hold();
    // When
    await f.page.getByRole('button',{name:'1회 완료',exact:true}).click();
    const buttons = f.page.locator('.return-box button');
    await expect(buttons.first()).toBeDisabled();
    await expect(f.page.locator('.return-box')).toContainText(/저장|확인/);
    await expect.poll(() => f.writes).toBe(1);
    // Then
    assert.equal(await buttons.first().isDisabled(),true,'completion remains clickable while saving');
    assert.match(await f.page.locator('.return-box').innerText(),/저장|확인/);
    assert.equal(f.writes,1);
    f.release();
    await f.page.getByRole('button',{name:'2회 완료',exact:true}).waitFor({timeout:4000});
    assert.equal(f.completions[0].count,1);
  });
test('persistent-error', async ({ audio: f }) => {
    // Given: isolated child/assignment HTTP fixture with no completions.
    f.fail();
    // When
    await f.page.getByRole('button',{name:'1회 완료',exact:true}).click();
    await expect(f.page.locator('.return-box')).toContainText(/실패|못했|확인|오류/);
    await f.page.clock.fastForward(3000);
    // Then
    assert.match(await f.page.locator('.return-box').innerText(),/실패|못했|확인|오류/,'failure disappears after toast');
    assert.equal(f.completions.length,0);
  });
test('return-before-save-response', async ({ audio: f }) => {
    // Given: isolated child/assignment HTTP fixture with no completions.
    f.holdAudio();
    // When
    await f.page.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('focus'));});
    await expect.poll(() => f.audioReturnPending).toBe(true);
    await f.page.getByRole('button',{name:'1회 완료',exact:true}).click();
    await f.page.getByRole('button',{name:'2회 완료',exact:true}).waitFor({timeout:4000});
    // Then
    assert.ok(f.completions[0].minutes > 0 && f.completions[0].minutes < 10,'completion uses fallback while local return time is available');
  });
test('failed-save-retry', async ({ audio: f }) => {
    // Given: isolated child/assignment HTTP fixture with no completions.
    f.fail();
    // When
    await f.page.getByRole('button',{name:'1회 완료',exact:true}).click();
    await f.page.getByRole('button',{name:'같은 요청 재시도',exact:true}).waitFor();
    f.recover();
    await f.page.getByRole('button',{name:'같은 요청 재시도',exact:true}).click();
    await f.page.getByRole('button',{name:'2회 완료',exact:true}).waitFor({timeout:4000});
    // Then
    assert.equal(f.completions[0].count,1);
    assert.equal(f.writes,2);
    await f.page.reload();
    await f.page.getByRole('button',{name:'2회 완료',exact:true}).waitFor({timeout:4000});
  });
test('lost-response-result-check', async ({ audio: f }) => {
    // Given: isolated child/assignment HTTP fixture with no completions.
    f.loseResponse();
    // When
    await f.page.getByRole('button',{name:'1회 완료',exact:true}).click();
    await f.page.getByRole('button',{name:'저장 결과 확인',exact:true}).click();
    await f.page.getByRole('button',{name:'2회 완료',exact:true}).waitFor({timeout:4000});
    // Then
    assert.equal(f.writes,1);
    assert.equal(f.completions[0].count,1);
  });
test('stalled-result-check-recovery', async ({ audio: f }) => {
    // Given: isolated child/assignment HTTP fixture with no completions.
    f.loseResponse();
    // When
    await f.page.getByRole('button',{name:'1회 완료',exact:true}).click();
    f.holdCheck();
    await f.page.getByRole('button',{name:'저장 결과 확인',exact:true}).click();
    await f.page.getByText('완료 저장 결과를 확인하고 있습니다.',{exact:true}).waitFor();
    await f.page.clock.fastForward(15_000);
    await expect(f.page.getByRole('button',{name:'저장 결과 확인',exact:true})).toBeVisible();
    f.release();
    await f.page.getByRole('button',{name:'저장 결과 확인',exact:true}).click();
    await f.page.getByRole('button',{name:'2회 완료',exact:true}).waitFor({timeout:4000});
    // Then
    assert.equal(f.writes,1);
    assert.equal(f.completions[0].count,1);
  });
