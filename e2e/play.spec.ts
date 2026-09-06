import { test, expect, type Page } from '@playwright/test';

/**
 * The constraint test.
 *
 * Henry is 8, types with two fingers, and half his sessions will be on a phone.
 * If a level cannot be completed by tapping alone at 390x844, the whole design
 * has failed — so this test uses taps only. No typing anywhere.
 */

/**
 * Get to HQ, whether or not this deployment has a database behind it.
 *
 * With sync switched off the first run ends at "Let's go". With sync on it asks
 * for a four-emoji secret first, twice. The game beyond that point is identical
 * either way, so the tests below should not have to care — and until this
 * handled both, none of them could run against the real deployment at all.
 */
async function enterHQ(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Turbo' }).click();
  await page.getByRole('button', { name: 'The Shed' }).click();
  await page.getByRole('button', { name: /Let's go|Next/ }).click();

  const secret = page.getByText('Pick a secret');
  if (await secret.isVisible({ timeout: 2000 }).catch(() => false)) {
    const pin = ['🍕', '🚀', '🐶', '🦜'];
    for (const round of [0, 1]) {
      void round;
      for (const emoji of pin) await page.getByRole('button', { name: emoji, exact: true }).click();
    }
  }

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

const picker = (page: Page) => page.getByTestId('hole-picker');

/**
 * Start from an empty database when one is faked for us.
 *
 * Otherwise profiles pile up across tests and the second test onwards is met by
 * "Who's playing?" instead of the first-run screen. Silently skipped when
 * pointed at a real deployment, which has no such endpoint and should never
 * have one.
 */
test.beforeEach(async ({ request }) => {
  const fake = process.env.E2E_FAKE_DB;
  if (fake) await request.post(`${fake}/__reset`).catch(() => undefined);
});

const goRight = (page: Page) => async () => {
  await expect(page.getByRole('heading', { name: 'Which way?' })).toBeVisible();
  await picker(page).getByRole('button', { name: '➡︎' }).click();
};

/** Pick a number in the dialog. The same digits exist in his code, so scope it. */
/**
 * Press Run, and answer Bolt if he asks first.
 *
 * Call It interposes one tap on the first run of a caper, so every test that
 * runs code goes through here rather than clicking Run directly — otherwise
 * they would all be testing a screen he never actually sees.
 */
async function runIt(page: Page, call?: string) {
  await page.getByRole('button', { name: /Run it/ }).click();
  const sheet = page.getByTestId('call-it');
  if (await sheet.isVisible({ timeout: 1500 }).catch(() => false)) {
    if (call) await sheet.getByRole('button', { name: call, exact: true }).click();
    else await sheet.getByRole('button', { name: 'Just run it' }).click();
  }
}

async function pickNumber(page: Page, n: number) {
  await expect(page.getByRole('heading', { name: 'How many?' })).toBeVisible();
  await picker(page).getByRole('button', { name: String(n), exact: true }).click();
  await picker(page).getByRole('button', { name: new RegExp(`Use ${n}`) }).click();
}

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

  await runIt(page);

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
  await runIt(page);
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
  await picker(page).getByRole('button', { name: '⬅︎' }).click();
  await runIt(page);

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
  await pickNumber(page, 5);

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

  await runIt(page);
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

  await runIt(page);
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

/** Start at a later level rather than replaying the earlier ones. */
async function unlockThrough(page: Page, count: number) {
  const ids = ['c1l1', 'c1l2', 'c1l3', 'c1l4', 'c1l5', 'c1l6'].slice(0, count);
  await page.addInitScript((done: string[]) => {
    window.localStorage.setItem(
      'coderx.progress.v1',
      JSON.stringify({
        version: 1,
        agentName: 'Turbo',
        hqName: 'The Shed',
        xp: 300,
        levels: Object.fromEntries(done.map((id) => [id, { completed: true }])),
        stickers: [],
        clubCards: [],
        streak: { lastDay: null, count: 0, best: 0, freezes: 2 },
        mastery: {},
        sessions: {},
        typedLines: 0,
        createdAt: new Date().toISOString(),
      }),
    );
  }, ids);
}

/** Is this brick actually within the visible part of the scrolling bar? */
async function brickIsInView(page: Page, label: string) {
  const bar = await page.getByTestId('brick-scroller').boundingBox();
  const brick = await page.getByRole('button', { name: label, exact: true }).boundingBox();
  if (!bar || !brick) return false;
  return brick.x >= bar.x - 1 && brick.x + brick.width <= bar.x + bar.width + 1;
}

/**
 * Reported after run 1: "chapter 1 page 6, bricks went off the edge of the
 * screen with no scroll." The row did scroll, but with the scrollbar hidden and
 * no arrows there was nothing to say so — which on a desktop, with no touch to
 * swipe with, made the last bricks simply unreachable.
 */
test('every brick on the busiest level can actually be reached', async ({ page }) => {
  await unlockThrough(page, 5);
  await page.goto('/play/c1l6');
  await page.getByRole('button', { name: 'On it' }).click();

  // 'bark' is the last of the eight bricks on this level.
  for (let i = 0; i < 8 && !(await brickIsInView(page, 'bark')); i += 1) {
    await page.getByRole('button', { name: 'More bricks' }).last().click();
    await page.waitForTimeout(250);
  }

  expect(await brickIsInView(page, 'bark')).toBe(true);
  await page.getByRole('button', { name: 'bark', exact: true }).click();
  await expect(page.getByRole('list').first()).toContainText('bark(sniff)');
});

/**
 * Also from run 1: "repeat and if need better ux. you should be able to move
 * bricks into the function, rather than have to know to write repeat first and
 * then add move."
 */
test('tapping repeat with a line selected wraps that line', async ({ page }) => {
  await unlockThrough(page, 3);
  await page.goto('/play/c1l4');
  await page.getByRole('button', { name: 'On it' }).click();

  // A brick is already selected once added, so this is the real flow: tap the
  // thing, then tap repeat around it.
  await page.getByRole('button', { name: 'grab', exact: true }).click();
  await page.getByRole('button', { name: 'repeat', exact: true }).click();
  await pickNumber(page, 3);

  const code = page.getByRole('list').first();
  await expect(code).toContainText('repeat 3 {');
  // The grab is now indented inside the loop rather than sitting after it.
  const grabLine = page.getByRole('listitem').filter({ hasText: 'grab' }).first();
  const repeatLine = page.getByRole('listitem').filter({ hasText: 'repeat' }).first();
  const grabBox = await grabLine.boundingBox();
  const repeatBox = await repeatLine.boundingBox();
  expect(grabBox!.x).toBeGreaterThan(repeatBox!.x);
});

test('a brick can be walked into a block and back out with the arrows', async ({ page }) => {
  await unlockThrough(page, 3);
  await page.goto('/play/c1l4');
  await page.getByRole('button', { name: 'On it' }).click();

  // An empty repeat, then a grab after it.
  await page.getByRole('button', { name: 'repeat', exact: true }).click();
  await pickNumber(page, 2);
  await expect(page.getByText('tap a brick to put it in here')).toBeVisible();

  await page.getByRole('listitem').filter({ hasText: /^\d+\}$/ }).first().click();
  await page.getByRole('button', { name: 'grab', exact: true }).click();

  const grabLine = () => page.getByRole('listitem').filter({ hasText: 'grab' }).first();
  const outdented = (await grabLine().boundingBox())!.x;

  // It is already selected, so press up: it should climb into the repeat above.
  await page.getByRole('button', { name: '↑' }).click();
  expect((await grabLine().boundingBox())!.x).toBeGreaterThan(outdented);
  await expect(page.getByText('tap a brick to put it in here')).toHaveCount(0);

  // And back out again.
  await page.getByRole('button', { name: '↓' }).click();
  expect((await grabLine().boundingBox())!.x).toBe(outdented);
});

/**
 * Chapter 2, which Henry designed: "fighting a dragon by collecting weapons."
 * It is also where a second character starts taking orders, and where variables
 * and repeatUntil arrive.
 */
test('the dragon can be fought by tapping alone', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'coderx.progress.v1',
      JSON.stringify({
        version: 1, agentName: 'Turbo', hqName: 'The Shed', xp: 400,
        levels: Object.fromEntries(
          ['c1l1','c1l2','c1l3','c1l4','c1l5','c1l6'].map((id) => [id, { completed: true }]),
        ),
        stickers: [], clubCards: [],
        streak: { lastDay: null, count: 0, best: 0, freezes: 2 },
        mastery: {}, sessions: {}, typedLines: 0, createdAt: new Date().toISOString(),
      }),
    );
  });

  await page.goto('/play/c2l1');
  await page.getByRole('button', { name: 'On it' }).click();

  const moveTwo = async () => {
    await page.getByRole('button', { name: 'move far', exact: true }).click();
    await picker(page).getByRole('button', { name: '➡︎' }).click();
    await pickNumber(page, 2);
  };

  await moveTwo();
  await page.getByRole('button', { name: 'grab', exact: true }).click();
  await moveTwo();
  await page.getByRole('button', { name: 'attack', exact: true }).click();

  await expect(page.getByRole('list').first()).toContainText('attack(sniff)');
  await runIt(page);
  await expect(page.getByRole('heading', { name: 'Nailed it!' })).toBeVisible({ timeout: 25_000 });
});

test('a level that is about a variable says so when you skip it', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'coderx.progress.v1',
      JSON.stringify({
        version: 1, agentName: 'Turbo', hqName: 'The Shed', xp: 500,
        levels: Object.fromEntries(
          ['c1l1','c1l2','c1l3','c1l4','c1l5','c1l6','c2l1','c2l2'].map((id) => [id, { completed: true }]),
        ),
        stickers: [], clubCards: [],
        streak: { lastDay: null, count: 0, best: 0, freezes: 2 },
        mastery: {}, sessions: {}, typedLines: 0, createdAt: new Date().toISOString(),
      }),
    );
  });

  await page.goto('/play/c2l3');
  await page.getByRole('button', { name: 'On it' }).click();

  // Solve it the blunt way: grab, walk up, swing three times. It works...
  await page.getByRole('button', { name: 'grab', exact: true }).click();
  await page.getByRole('button', { name: 'move far', exact: true }).click();
  await picker(page).getByRole('button', { name: '➡︎' }).click();
  await pickNumber(page, 2);
  for (let i = 0; i < 3; i += 1) {
    await page.getByRole('button', { name: 'attack', exact: true }).click();
  }

  await runIt(page);
  // ...but the level is about naming a number, so it says so and stays open.
  await expect(page.getByText(/about a particular trick/)).toBeVisible({ timeout: 25_000 });
  await expect(page.getByRole('heading', { name: 'Nailed it!' })).toHaveCount(0);
});

/** Everything before Chapter 3, so grid levels are reachable. */
async function unlockChapters(page: Page, upTo: string) {
  const all = [
    'c1l1','c1l2','c1l3','c1l4','c1l5','c1l6',
    'c2l1','c2l2','c2l3','c2l4','c2l5','c2l6',
    'c3l1','c3l2','c3l3','c3l4','c3l5','c3l6',
  ];
  const done = all.slice(0, all.indexOf(upTo));
  await page.addInitScript((ids: string[]) => {
    window.localStorage.setItem(
      'coderx.progress.v1',
      JSON.stringify({
        version: 1, agentName: 'Turbo', hqName: 'The Shed', xp: 900,
        levels: Object.fromEntries(ids.map((id) => [id, { completed: true }])),
        stickers: [], clubCards: [],
        streak: { lastDay: null, count: 0, best: 0, freezes: 2 },
        mastery: {}, sessions: {}, typedLines: 0, createdAt: new Date().toISOString(),
      }),
    );
  }, done);
}

/**
 * Chapter 3 moves off the single street onto a grid, which is the only shape
 * that can teach coordinates — and it needs up and down to work by tapping.
 */
test('a grid level can be finished by tapping, going down as well as across', async ({ page }) => {
  await unlockChapters(page, 'c3l1');
  await page.goto('/play/c3l1');
  await page.getByRole('button', { name: 'On it' }).click();

  await page.getByRole('button', { name: 'move far', exact: true }).click();
  await picker(page).getByRole('button', { name: '⬇︎' }).click();
  await pickNumber(page, 2);

  await page.getByRole('button', { name: 'move far', exact: true }).click();
  await picker(page).getByRole('button', { name: '➡︎' }).click();
  await pickNumber(page, 3);

  await page.getByRole('button', { name: 'grab', exact: true }).click();

  await expect(page.getByRole('list').first()).toContainText('move(bolt, down, 2)');
  await runIt(page);
  await expect(page.getByRole('heading', { name: 'Nailed it!' })).toBeVisible({ timeout: 25_000 });
});

/**
 * The headline of the chapter: a command he writes becomes a brick he can tap.
 * Henry used the word "function" unprompted after run 1 — this is that idea
 * turned into a button.
 */
test('defining a command puts a new brick in his bar', async ({ page }) => {
  await unlockChapters(page, 'c3l5');
  await page.goto('/play/c3l5');
  await page.getByRole('button', { name: 'On it' }).click();

  // No such brick before he invents it.
  await expect(page.getByRole('button', { name: 'tidy', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'teach a move', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What shall we call it?' })).toBeVisible();
  await picker(page).getByRole('button', { name: 'tidy', exact: true }).click();
  await picker(page).getByRole('button', { name: 'Teach it' }).click();

  await expect(page.getByRole('list').first()).toContainText('define tidy {');

  // And now it exists, in the bar, tappable like anything else.
  const brick = page.getByTestId('brick-scroller').getByRole('button', { name: 'tidy', exact: true });
  for (let i = 0; i < 8 && !(await brickIsInView(page, 'tidy')); i += 1) {
    await page.getByRole('button', { name: 'More bricks' }).last().click();
    await page.waitForTimeout(200);
  }
  await expect(brick).toBeVisible();

  // Put something in the definition, then call it.
  await page.getByRole('listitem').filter({ hasText: 'define tidy' }).first().click();
  await page.getByRole('button', { name: 'grab', exact: true }).click();
  await page.getByRole('listitem').filter({ hasText: /^\d+\}$/ }).first().click();
  await brick.click();
  await expect(page.getByRole('list').first()).toContainText('tidy()');
});

/**
 * The regression this chapter most threatens: a grid needs vertical space, and
 * his code area was only just rescued from 40px.
 */
test('a grid level still leaves room for the code on a real phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 660 });
  await unlockChapters(page, 'c3l4');
  await page.goto('/play/c3l4');
  await page.getByRole('button', { name: 'On it' }).click();

  const box = await page.getByTestId('code-scroll').boundingBox();
  expect(box!.height).toBeGreaterThan(150);
  expect(box!.y + box!.height).toBeLessThanOrEqual(660);
  await page.screenshot({ path: 'screenshots/c3-grid-phone.png' });
});

test('the workshop is open, with nothing to get wrong', async ({ page }) => {
  await unlockChapters(page, 'c3l1');
  await page.goto('/sandbox');
  await page.getByRole('button', { name: 'On it' }).click();
  // 'Free play' is both the header and the goal line, so pin it to the header.
  await expect(page.getByText('Free play', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'bark', exact: true }).click();
  // The character buttons carry their emoji too, so the name is not exact.
  await picker(page).getByRole('button', { name: /sniff/ }).click();
  await runIt(page);
  // No win screen, because there is nothing to win.
  await page.waitForTimeout(2000);
  await expect(page.getByRole('heading', { name: 'Nailed it!' })).toHaveCount(0);
});

/**
 * A caper that did not exist until it was asked for.
 *
 * The whole point of a generated level is that it is a real level: the same
 * editor, the same interpreter, the same win screen, and above all the same
 * constraint — it has to be finishable by tapping alone at phone size, from an
 * id that is the only place it exists.
 */
test('a generated caper can be finished by tapping alone', async ({ page }) => {
  await unlockThrough(page, 3);
  // Past the scaffold, so this tests the blank page. The head start has its own
  // test below — mixing the two would leave neither actually checked.
  await page.addInitScript(() => {
    const key = 'coderx.progress.v1';
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    const state = JSON.parse(raw);
    state.mastery = { 'code.sequence': { attempts: 9, successes: 9, lastSeen: '2026-01-01' },
                      'code.loops': { attempts: 9, successes: 9, lastSeen: '2026-01-01' } };
    window.localStorage.setItem(key, JSON.stringify(state));
  });
  await page.goto('/play/g-binrun-1-0000');

  // It is a proper caper, with prose to read and a budget stated up front.
  await expect(page.getByRole('heading', { name: 'Somebody Else Did This' }).first()).toBeVisible();
  await expect(page.getByText(/every single square/)).toBeVisible();
  await page.getByRole('button', { name: 'On it' }).click();
  await expect(page.getByText('Bin all 4 — in 5 lines or fewer.')).toBeVisible();

  // Four bins in a row: one loop of grab, drop, step along.
  await page.getByRole('button', { name: 'repeat', exact: true }).click();
  await pickNumber(page, 4);
  await page.getByRole('button', { name: 'grab', exact: true }).click();
  await page.getByRole('button', { name: 'drop', exact: true }).click();
  await page.getByRole('button', { name: 'move', exact: true }).click();
  await picker(page).getByRole('button', { name: '➡︎' }).click();

  await expect(page.getByRole('list').first()).toContainText('repeat 4 {');
  await runIt(page);
  await expect(page.getByRole('heading', { name: 'Nailed it!' })).toBeVisible({ timeout: 25_000 });

  // It pays in XP and, this time, a crew badge. What it must never do is mint
  // a story sticker: those are jokes about hand-written moments.
  await expect(page.getByText(/^\+\d+ XP$/)).toBeVisible();
  await expect(page.getByText('New sticker')).toHaveCount(0);
  await expect(page.getByText('New badge')).toBeVisible();
});

test("HQ offers a choice of capers, and they are playable", async ({ page }) => {
  await unlockThrough(page, 3);
  await page.goto('/');

  const strip = page.locator('section').filter({ hasText: /Today.s capers/ }).first();
  await expect(strip).toBeVisible();
  // A choice, never a queue of one — picking is half of why he comes back.
  const offered = strip.getByRole('link');
  expect(await offered.count()).toBeGreaterThanOrEqual(2);

  await offered.first().click();
  await expect(page.getByRole('button', { name: 'On it' })).toBeVisible();
});

/**
 * Say what will happen before you find out.
 *
 * Getting it wrong has to cost nothing, or he stops guessing — and a boy who
 * stops guessing has stopped predicting, which was the whole point.
 */
test('calling it wrong costs nothing', async ({ page }) => {
  await unlockThrough(page, 3);
  await page.goto('/play/c1l4');
  await page.getByRole('button', { name: 'On it' }).click();

  // A correct solution, built the long way round so the budget still allows it.
  await page.getByRole('button', { name: 'repeat', exact: true }).click();
  await pickNumber(page, 3);
  await tapBrick(page, 'grab');
  await tapBrick(page, 'move', goRight(page));
  await tapBrick(page, 'drop');
  await tapBrick(page, 'move', goRight(page));

  await page.getByRole('button', { name: /Run it/ }).click();

  // Bolt asks first, and the true answer is on offer.
  const sheet = page.getByTestId('call-it');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText(/how many bags go in/i)).toBeVisible();
  await expect(sheet.getByRole('button', { name: '3', exact: true })).toBeVisible();

  // Call it wrong on purpose.
  await sheet.getByRole('button', { name: '0', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nailed it!' })).toBeVisible({ timeout: 25_000 });

  // Warm about the miss, and paid for having a go regardless.
  await expect(page.getByText(/it was 3/i).first()).toBeVisible();
  await expect(page.getByText('Called it first')).toBeVisible();
  await expect(page.getByText(/wrong|incorrect/i)).toHaveCount(0);
});

test('a caper that has beaten him hands him a leg-up, cursor and all', async ({ page }) => {
  // Not everyone gets one: a boy on his first caper needs to write it himself.
  // This is the other case — a level he has genuinely failed three times.
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'coderx.progress.v1',
      JSON.stringify({
        version: 1, agentName: 'Turbo', hqName: 'The Shed', avatar: 'sniff', xp: 300,
        levels: {
          c1l1: { completed: true }, c1l2: { completed: true },
          c1l3: { completed: false, attempts: 4, hintsUsed: 3, bestSize: null, typedItHimself: false, lastCode: '' },
        },
        stickers: [], clubCards: [], streak: { lastDay: null, count: 0, best: 0, freezes: 2 },
        mastery: {}, sessions: {}, typedLines: 0, createdAt: new Date().toISOString(),
      }),
    );
  });
  await page.goto('/play/c1l3');
  await page.getByRole('button', { name: 'On it' }).click();

  const code = page.getByTestId('code-scroll');
  await expect(code).toContainText('repeat 3 {');
  await expect(code).toContainText('grab');

  // The missing step, tapped. It must land INSIDE the loop — left to default,
  // the first tap went after the closing brace and the level errored on a move
  // that looked perfectly sensible.
  await page.getByRole('button', { name: 'move far', exact: true }).click();
  await picker(page).getByRole('button', { name: '➡︎' }).click();
  await pickNumber(page, 2);

  await runIt(page, '3');
  await expect(page.getByRole('heading', { name: 'Nailed it!' })).toBeVisible({ timeout: 25_000 });
});

test('a brand new player writes his first caper himself', async ({ page }) => {
  // The head start must never reach level one. Arriving to four of its five
  // lines would make the level where he first tells a dog what to do a level
  // where he does almost nothing.
  await enterHQ(page);
  await openLevelOne(page);
  await expect(page.getByTestId('code-scroll')).toContainText('Nothing here yet');
});
