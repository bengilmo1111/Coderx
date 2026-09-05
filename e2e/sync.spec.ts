import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * The actual user story: Henry plays on the family computer, then picks up the
 * phone, and it is the same game.
 *
 * Opt-in, because it needs a real configured database and it creates a profile
 * each run. Against a deployment with Supabase set up:
 *
 *   E2E_SYNC=1 E2E_BASE_URL=https://coderx-psi.vercel.app npx playwright test sync
 */
test.skip(process.env.E2E_SYNC !== '1', 'needs a configured Supabase project');

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
  await two.getByRole('textbox').first().fill(name);
  await two.getByRole('button', { name: 'The Shed' }).click();
  await two.getByRole('button', { name: /Next|Let's go/ }).click();
  await tapPin(two);

  // Everything he did on the computer is here.
  await expect(two.getByRole('link', { name: /The Long Street/ })).toBeVisible({ timeout: 20_000 });
  const xp = await two.getByText(/^\d+ XP/).first().textContent();
  expect(Number(xp?.split(' ')[0])).toBeGreaterThan(0);

  await computer.close();
  await phone.close();
});
