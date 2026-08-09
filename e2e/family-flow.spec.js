import { expect, test } from '@playwright/test';

test('a new family can complete onboarding and open the calendar', async ({ page }) => {
  const familyName = `Browser Familie ${Date.now()}`;

  await page.goto('/');
  await page.getByRole('button', { name: 'Neue Familie anlegen' }).click();

  await expect(
    page.getByText('http://127.0.0.1:4170', { exact: true })
  ).toBeVisible();

  await page.getByLabel('Familienname').fill(familyName);
  await page.getByLabel('Familienpasswort').fill('BrowserTest!2026');
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();

  await page.getByLabel('Name').fill('Alex Browser');
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.getByRole('button', { name: 'Familienraum eröffnen' }).click();

  await expect(
    page.getByRole('button', { name: 'Kalender', exact: true })
  ).toBeVisible();
  const releaseNotes = page.locator('.release-notes-layer');
  await expect(releaseNotes).toBeVisible();
  await releaseNotes.locator('.release-notes-confirm').click();
  await expect(releaseNotes).toBeHidden();
  await page.getByRole('button', { name: 'Kalender', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Kalender', exact: true })
  ).toHaveAttribute('aria-current', 'page');
});
