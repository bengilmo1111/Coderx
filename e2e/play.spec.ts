import { test, expect, type Page } from '@playwright/test';

/**
 * The constraint test.
 *
 * Henry is 8, types with two fingers, and half his sessions will be on a phone.
 * If a level cannot be completed by tapping alone at 390x844, the whole design
 * has failed — so this test uses taps only. No typing anywhere.
 */

async function enterHQ(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Turbo' }).click();
  await page.getByRole('button', { name: 'The Shed' }).click();
  await page.getByRole('button', { name: /Let's go/ }).click();
  await expect(page.getByRole('heading', { name: 'The Shed' })).toBeVisible();
}

async function openLevelOne(page: Page) {
  await page.getByRole('link', { name: /Sniff Reports for Duty/ }).click();
  await page.getByRole('button', { name: 'On it' }).click();
}

/** Tap a brick, then answer whichever picker it opens. */
async function tapBrick(page: Page, label: string, fill?: () => Promise<void>) {
  await page.getByRole('button', { name: label, exact: true }).click();
  if (fill) await fill();
}

const goRight = (page: Page) => async () => {
  await expect(page.getByRole('heading', { name: 'Which way?' })).toBeVisible();
  await page.getByRole('button', { name: '➡︎' }).click();
};

test('a level can be finished by tapping alone', async ({ page }) => {
  await enterHQ(page);
  await openLevelOne(page);

  await tapBrick(page, 'move', goRight(page));
  await tapBrick(page, 'grab');
  await tapBrick(page, 'move', goRight(page));
  await tapBrick(page, 'move', goRight(page));
  await tapBrick(page, 'drop');

  // What he built is real code text, not blocks.
  const code = page.getByRole('list').first();
  await expect(code).toContainText('move(sniff, right)');
  await expect(code).toContainText('drop(sniff)');

  await page.getByRole('button', { name: /Run it/ }).click();

  await expect(page.getByRole('heading', { name: 'Nailed it!' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Club card', { exact: false })).toBeVisible();
});

test('progress survives coming back later', async ({ page }) => {
  await enterHQ(page);
  await openLevelOne(page);
  await tapBrick(page, 'move', goRight(page));
  await tapBrick(page, 'grab');
  await tapBrick(page, 'move', goRight(page));
  await tapBrick(page, 'move', goRight(page));
  await tapBrick(page, 'drop');
  await page.getByRole('button', { name: /Run it/ }).click();
  await expect(page.getByRole('heading', { name: 'Nailed it!' })).toBeVisible({ timeout: 20_000 });

  await page.goto('/');
  // Level 2 is now unlocked, and level 1 shows as done.
  await expect(page.getByRole('link', { name: /The Long Street/ })).toBeVisible();
  await expect(page.getByText(/XP/).first()).toBeVisible();
  const xp = await page.getByText(/^\d+ XP/).first().textContent();
  expect(Number(xp?.split(' ')[0])).toBeGreaterThan(0);
});

test('an impossible move is a joke, not a crash', async ({ page }) => {
  await enterHQ(page);
  await openLevelOne(page);

  // Walk Sniff straight into the fence on purpose.
  await page.getByRole('button', { name: 'move', exact: true }).click();
  await page.getByRole('button', { name: '⬅︎' }).click();
  await page.getByRole('button', { name: /Run it/ }).click();

  await expect(page.getByText(/bonked straight into the fence/)).toBeVisible({ timeout: 20_000 });
});

test('screenshot the play screen', async ({ page }, testInfo) => {
  await enterHQ(page);
  await openLevelOne(page);
  await tapBrick(page, 'move', goRight(page));
  await tapBrick(page, 'grab');
  await tapBrick(page, 'move', goRight(page));
  await page.screenshot({ path: `screenshots/${testInfo.project.name}-play.png`, fullPage: false });
});

/**
 * The nesting test.
 *
 * Level 5 needs a repeat containing an if containing two commands, with a move
 * that must land INSIDE the repeat but OUTSIDE the if. That last step is the
 * one a child gets wrong in every block editor, and it is why selecting the
 * closing brace means "after the whole block". If this can't be tapped out, the
 * editor doesn't work.
 */
test('a nested if inside a repeat can be built by tapping', async ({ page }) => {
  // Start him at level 5 rather than replaying four capers.
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'coderx.progress.v1',
      JSON.stringify({
        version: 1,
        agentName: 'Turbo',
        hqName: 'The Shed',
        xp: 200,
        levels: {
          c1l1: { completed: true }, c1l2: { completed: true },
          c1l3: { completed: true }, c1l4: { completed: true },
        },
        stickers: [], clubCards: [],
        streak: { lastDay: null, count: 0, best: 0, freezes: 2 },
        mastery: {}, sessions: {}, typedLines: 0,
        createdAt: new Date().toISOString(),
      }),
    );
  });

  await page.goto('/play/c1l5');
  await page.getByRole('button', { name: 'On it' }).click();

  // repeat 5 { ... }
  await page.getByRole('button', { name: 'repeat', exact: true }).click();
  await page.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: /Use 5/ }).click();

  // The if lands inside the repeat, because the repeat header is selected.
  await page.getByRole('button', { name: 'if rubbish here', exact: true }).click();
  await page.getByRole('button', { name: 'grab', exact: true }).click();
  await page.getByRole('button', { name: 'drop', exact: true }).click();

  // Now step back out: selecting the if's closing brace means "after this block".
  await page.getByRole('listitem').filter({ hasText: /^\d+\}$/ }).first().click();
  await page.getByRole('button', { name: 'move', exact: true }).click();
  await page.getByRole('button', { name: '➡︎' }).click();

  const code = page.getByRole('list').first();
  await expect(code).toContainText('repeat 5 {');
  await expect(code).toContainText('if rubbishHere(sniff) {');

  await page.getByRole('button', { name: /Run it/ }).click();
  await expect(page.getByRole('heading', { name: 'Nailed it!' })).toBeVisible({ timeout: 30_000 });
});

/**
 * Regression from real playtesting on a phone.
 *
 * Henry could not see his own code: it had been squeezed to a single clipped
 * line at the bottom of the screen, because the stage, the goal, the run bar,
 * Bolt's error block and an Ask Bolt row all took fixed height first and the
 * code got whatever was left. The viewport here is deliberately 660px — a
 * 390x844 phone minus the browser's own chrome, which is what he actually has.
 */
test('the code stays visible on a real phone, even with an error showing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 660 });
  await enterHQ(page);
  await openLevelOne(page);

  // Grabbing before moving finds nothing — the worst case for layout, because
  // Bolt's error used to take a whole block of its own.
  await tapBrick(page, 'grab');
  await tapBrick(page, 'move', goRight(page));
  await tapBrick(page, 'move', goRight(page));

  await page.getByRole('button', { name: /Run it/ }).click();
  await expect(page.getByText(/grabbed some air|bonked/)).toBeVisible({ timeout: 20_000 });

  const scroller = page.getByTestId('code-scroll');
  const box = await scroller.boundingBox();
  expect(box).not.toBeNull();

  // Enough room for several lines, not one clipped one. It was 40px.
  expect(box!.height).toBeGreaterThan(180);
  // And it must sit inside the viewport rather than off the bottom.
  expect(box!.y + box!.height).toBeLessThanOrEqual(660);

  // The first line of his code is actually on screen.
  const first = page.getByRole('listitem').first();
  const fb = await first.boundingBox();
  expect(fb!.y).toBeGreaterThan(box!.y - 1);
  expect(fb!.y + fb!.height).toBeLessThanOrEqual(660);

  await page.screenshot({ path: 'screenshots/phone-small-play.png' });
});
