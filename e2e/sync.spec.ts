import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * The actual user story: Henry plays on the family computer, then picks up the
 * phone, and it is the same game.
 *
 * Opt-in, because it needs a configured database and creates a profile each
 * run. Two ways to give it one:
 *
 *   # against the fake, which is emptied between tests and costs nothing
 *   node e2e/fake-postgrest.mjs &
 *   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=x \
 *     SESSION_SECRET=test-secret-abcdefghijklmnop npx next start -p 3100 &
 *   E2E_BASE_URL=http://127.0.0.1:3100 E2E_FAKE_DB=http://127.0.0.1:54321 \
 *     npx playwright test sync
 *
 *   # against a real deployment — leaves a profile behind, so tidy up after
 *   E2E_SYNC=1 E2E_BASE_URL=https://coderx-psi.vercel.app npx playwright test sync
 */
const FAKE_DB = process.env.E2E_FAKE_DB;
test.skip(process.env.E2E_SYNC !== '1' && !FAKE_DB, 'needs a configured Supabase project');

test.beforeEach(async ({ request }) => {
  if (FAKE_DB) await request.post(`${FAKE_DB}/__reset`).catch(() => undefined);
});

const PIN = ['🍕', '🚀', '🐶', '🍕'];

async function tapPin(page: Page) {
  for (const emoji of PIN) {
    await page.getByRole('button', { name: emoji, exact: true }).click();
  }
}

async function finishLevelOne(page: Page) {
  await page.getByRole('link', { name: /Sniff Reports for Duty/ }).click();
  await page.getByRole('button', { name: 'On it' }).click();
  const picker = page.getByTestId('hole-picker');
  const right = async () => {
    await page.getByRole('button', { name: 'move', exact: true }).click();
    await picker.getByRole('button', { name: '➡︎' }).click();
  };
  await right();
  await page.getByRole('button', { name: 'grab', exact: true }).click();
  await right();
  await right();
  await page.getByRole('button', { name: 'drop', exact: true }).click();
  await page.getByRole('button', { name: /Run it/ }).click();
  await expect(page.getByRole('heading', { name: 'Nailed it!' })).toBeVisible({ timeout: 25_000 });
}

test('progress follows him from one device to the other', async ({ browser }) => {
  const name = `Test${Date.now().toString().slice(-6)}`;

  // The family computer: first run, pick a code, finish a caper.
  const computer: BrowserContext = await browser.newContext();
  const one = await computer.newPage();
  await one.goto('/');
  await one.getByRole('textbox').first().fill(name);
  await one.getByRole('button', { name: 'The Shed' }).click();
  await one.getByRole('button', { name: /Next|Let's go/ }).click();
  // Set once, then confirmed — a secret typed wrong here is only discovered on
  // the other device, weeks later, so it is asked for twice.
  await tapPin(one);
  await tapPin(one);
  await expect(one.getByRole('heading', { name: 'The Shed' })).toBeVisible({ timeout: 20_000 });

  await finishLevelOne(one);
  await one.goto('/');
  // Give the debounced push time to land.
  await one.waitForTimeout(5000);

  // The phone: a completely separate browser, signing in with the same four.
  const phone: BrowserContext = await browser.newContext();
  const two = await phone.newPage();
  await two.goto('/');

  // It must offer to let him IN, not offer to set him up again. This assertion
  // is the point of the test: the version before it, the phone showed the
  // new-player wizard and he ended up with two profiles and half his stickers
  // in each.
  await expect(two.getByText(new RegExp(`Hello again, ${name}`))).toBeVisible({ timeout: 20_000 });
  await expect(two.getByPlaceholder('Agent…')).toHaveCount(0);

  await tapPin(two);

  // Everything he did on the computer is here.
  await expect(two.getByRole('link', { name: /The Long Street/ })).toBeVisible({ timeout: 20_000 });
  const xp = await two.getByText(/^\d+ XP/).first().textContent();
  expect(Number(xp?.split(' ')[0])).toBeGreaterThan(0);

  await computer.close();
  await phone.close();
});

/**
 * The recorder, end to end.
 *
 * docs/memory-loop.md's build order starts with "write observations, change
 * nothing about the game". Nothing in the app reads these back yet, so the only
 * thing that can prove the clock has actually started is watching a real
 * session land real rows.
 */
test('playing a caper leaves a record of what he did', async ({ browser, request }) => {
  test.skip(!FAKE_DB, 'reads rows back, so it needs the fake');
  const name = `Obs${Date.now().toString().slice(-6)}`;

  const context: BrowserContext = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('textbox').first().fill(name);
  await page.getByRole('button', { name: 'The Shed' }).click();
  await page.getByRole('button', { name: /Next|Let's go/ }).click();
  await tapPin(page);
  await tapPin(page);
  await expect(page.getByRole('heading', { name: 'The Shed' })).toBeVisible({ timeout: 20_000 });

  await finishLevelOne(page);
  // Leaving the level flushes the batch on the way out.
  await page.goto('/');
  await page.waitForTimeout(5000);

  const res = await request.get(`${FAKE_DB}/rest/v1/observations?select=*`);
  const rows = (await res.json()) as {
    kind: string;
    level_id: string | null;
    skill_ids: string[] | null;
    payload: Record<string, unknown>;
  }[];

  // He tapped bricks and finished a level, so both must be there.
  expect(rows.map((r) => r.kind)).toContain('brick_used');
  const attempt = rows.find((r) => r.kind === 'level_attempt');
  expect(attempt).toBeTruthy();
  expect(attempt?.level_id).toBe('c1l1');
  expect(attempt?.payload.won).toBe(true);
  // The skills the level exercises ride along, so a rollup never has to guess.
  expect(attempt?.skill_ids?.length).toBeGreaterThan(0);

  // He won, so there is nothing to call abandonment.
  expect(rows.map((r) => r.kind)).not.toContain('abandon');

  await context.close();
});
