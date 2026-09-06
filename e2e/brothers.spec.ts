import { expect, test, type Page } from '@playwright/test';

/**
 * Two brothers, two devices.
 *
 * This is the story the app exists to support and the one that had never
 * actually been clicked through: Henry sets himself up on the family computer,
 * Casper is added on the same computer without inheriting anything, and Henry
 * signs in on a phone with four pictures and finds his own game waiting.
 *
 * It runs against a fake PostgREST (see e2e/fake-postgrest.mjs) rather than the
 * family's real database, so it can be run as often as it likes and never
 * leaves a stray profile in front of a child's sign-in screen.
 */

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100';
const FAKE_DB = process.env.E2E_FAKE_DB;

// This suite needs a database it is allowed to empty between tests, so it runs
// only against the fake one. Pointed at a real deployment it skips rather than
// creating stray profiles in front of a child's sign-in screen.
test.skip(!FAKE_DB, 'needs E2E_FAKE_DB (see e2e/fake-postgrest.mjs)');

test.beforeEach(async ({ request }) => {
  await request.post(`${FAKE_DB}/__reset`);
});

/** The emoji pad, in order. Picking four of these is the whole password. */
const PIN = ['🍕', '🚀', '🐶', '🦜'];
const OTHER_PIN = ['🤖', '🐉', '🧀', '🎸'];

async function tapPin(page: Page, pin: string[]) {
  for (const emoji of pin) {
    await page.getByRole('button', { name: emoji, exact: true }).click();
  }
}

/** Name, HQ and character, then the code twice. */
async function fillFirstRun(page: Page, name: string, hq: string, character: string, pin: string[]) {
  await page.getByPlaceholder('Agent…').fill(name);
  await page.getByPlaceholder('The…').fill(hq);
  await page.getByRole('button', { name: character }).click();
  await page.getByRole('button', { name: /Next →/ }).click();
  await expect(page.getByText('Pick a secret')).toBeVisible();
  await tapPin(page, pin);
  await expect(page.getByText('Once more')).toBeVisible();
  await tapPin(page, pin);
}

test('a mistyped secret is caught while he is still sitting there', async ({ page }) => {
  await page.goto(BASE);
  await page.getByPlaceholder('Agent…').fill('Typo');
  await page.getByPlaceholder('The…').fill('The Shed');
  await page.getByRole('button', { name: /Next →/ }).click();

  await tapPin(page, PIN);
  await expect(page.getByText('Once more')).toBeVisible();
  await tapPin(page, OTHER_PIN); // a fat-fingered second go

  await expect(page.getByText(/Those two were different/)).toBeVisible();
  // And he is back at the start rather than being asked which one he meant.
  await expect(page.getByText('Pick a secret')).toBeVisible();
});

test('undo costs one tap, not four', async ({ page }) => {
  await page.goto(BASE);
  await page.getByPlaceholder('Agent…').fill('Undo');
  await page.getByPlaceholder('The…').fill('The Shed');
  await page.getByRole('button', { name: /Next →/ }).click();

  await page.getByRole('button', { name: '🍕', exact: true }).click();
  await page.getByRole('button', { name: '🚀', exact: true }).click();
  const soFar = page.getByTestId('pin-so-far');
  await expect(soFar).toContainText('🚀');
  await page.getByRole('button', { name: 'Undo last picture' }).click();
  await expect(soFar).not.toContainText('🚀');
  await expect(soFar).toContainText('🍕');
});

test('Casper does not inherit Henry\'s game, and Henry finds his on the phone', async ({ browser }) => {
  // --- The family computer ---
  const computer = await browser.newContext();
  const page = await computer.newPage();
  await page.goto(BASE);

  await fillFirstRun(page, 'Turbo', 'The Shed', 'Sniff', PIN);
  await expect(page.getByText('Agent Turbo')).toBeVisible();

  // Henry plays. Level one is enough to put real progress on the profile.
  await page.getByText('Sniff Reports for Duty').click();
  await expect(page).toHaveURL(/play\/c1l1/);
  await page.goBack();
  await expect(page.getByText('Agent Turbo')).toBeVisible();

  // --- Casper arrives at the same computer ---
  await page.getByRole('button', { name: "Who's playing" }).click();
  await page.getByRole('button', { name: /Add a player/ }).click();
  await fillFirstRun(page, 'Rocket', 'Bin HQ', 'Dragon', OTHER_PIN);

  // He is himself, at zero, with his own character.
  await expect(page.getByText('Agent Rocket')).toBeVisible();
  await expect(page.getByText('0 XP', { exact: false })).toBeVisible();
  await expect(page.getByText('Agent Turbo')).toHaveCount(0);

  // --- Henry, on the phone ---
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobile = await phone.newPage();
  await mobile.goto(BASE);

  // Two profiles now exist, so he gets the picker rather than the setup wizard.
  await expect(mobile.getByText("Who's playing?")).toBeVisible();
  await expect(mobile.getByRole('button', { name: /Turbo/ })).toBeVisible();
  await expect(mobile.getByRole('button', { name: /Rocket/ })).toBeVisible();
  await expect(mobile.getByPlaceholder('Agent…')).toHaveCount(0);

  await mobile.getByRole('button', { name: /Turbo/ }).click();
  await expect(mobile.getByText(/Hello again, Turbo/)).toBeVisible();

  // The wrong four are refused.
  await tapPin(mobile, OTHER_PIN);
  await expect(mobile.getByText(/Not those four/)).toBeVisible();

  // The right four let him in, as himself.
  await tapPin(mobile, PIN);
  await expect(mobile.getByText('Agent Turbo')).toBeVisible();
  // His own HQ, in the header — not Casper's, and not a fresh one.
  await expect(mobile.getByRole('button', { name: /The Shed .*Agent Turbo/ })).toBeVisible();

  await computer.close();
  await phone.close();
});

test('swapping back to a brother asks for his code, and signs him in properly', async ({ page }) => {
  // Henry has been playing here since before there was a database.
  await page.addInitScript(() => {
    localStorage.setItem(
      'coderx.progress.v1',
      JSON.stringify({
        version: 1, agentName: 'Turbo', hqName: 'The Shed', avatar: 'sniff', xp: 640,
        levels: { c1l1: { completed: true, attempts: 1, hintsUsed: 0, bestSize: 5, typedItHimself: true, lastCode: '' } },
        stickers: ['sniff-badge'], clubCards: ['sequence'],
        streak: { lastDay: '2026-09-05', count: 6, best: 6, freezes: 2 },
        mastery: {}, sessions: {}, typedLines: 14, createdAt: '2026-08-01T00:00:00.000Z',
      }),
    );
  });
  await page.goto(BASE);
  await expect(page.getByText('Agent Turbo')).toBeVisible();

  // He puts his existing game in the cloud, keeping all of it.
  await page.getByRole('button', { name: "Who's playing" }).click();
  await page.getByRole('button', { name: /Save my game to the cloud/ }).click();
  await tapPin(page, PIN);
  await tapPin(page, PIN);
  await expect(page.getByText('640 XP', { exact: false })).toBeVisible();

  // Casper is added, and starts at nothing.
  await page.getByRole('button', { name: "Who's playing" }).click();
  await page.getByRole('button', { name: /Add a player/ }).click();
  await fillFirstRun(page, 'Rocket', 'Bin HQ', 'The Dragon', OTHER_PIN);
  await expect(page.getByText('Agent Rocket')).toBeVisible();
  await expect(page.getByText('0 XP', { exact: false })).toBeVisible();

  // Swapping back must ask for Henry's four. Before this was fixed it signed
  // out and dropped whoever tapped it into the local game — which looks like
  // it worked, plays like it worked, and syncs nothing.
  await page.getByRole('button', { name: "Who's playing" }).click();
  await page.getByRole('button', { name: /Turbo/ }).click();
  await expect(page.getByText(/Hello again, Turbo/)).toBeVisible();

  // Casper's code does not get him into his brother's game.
  await tapPin(page, OTHER_PIN);
  await expect(page.getByText(/Not those four/)).toBeVisible();

  await tapPin(page, PIN);
  await expect(page.getByText('Agent Turbo')).toBeVisible();
  await expect(page.getByText('640 XP', { exact: false })).toBeVisible();

  // And he is genuinely signed in, not just looking at local data.
  await page.getByRole('button', { name: "Who's playing" }).click();
  await expect(page.getByText(/saved to the cloud/)).toBeVisible();
});
