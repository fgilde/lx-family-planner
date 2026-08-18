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

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.app-header')).toHaveCSS('position', 'fixed');
  await expect(page.locator('.calendar-history-toggle')).toHaveCSS(
    'justify-content',
    'center'
  );
  await expect(page.locator('.calendar-import-action')).toHaveCSS(
    'justify-content',
    'center'
  );
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect.poll(() => page.locator('.app-header').evaluate(
    element => Math.round(element.getBoundingClientRect().top)
  )).toBe(0);
  await page.getByRole('button', { name: 'Menü öffnen' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Menü' })
  ).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('position', 'fixed');
  await page.getByRole('button', { name: 'Schließen' }).click();
  await expect(page.locator('body')).not.toHaveCSS('position', 'fixed');

  const created = await page.evaluate(async () => {
    const date = new Date();
    const dateKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
    const response = await fetch('/api/resources/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: `mobile-dialog-${Date.now()}`,
        title: 'Mobiler Dialog-Test',
        date: dateKey,
        time: '09:00',
        allDay: false,
        memberId: 'all',
        reminders: [10]
      })
    });
    return { ok: response.ok, body: await response.json() };
  });
  expect(created.ok).toBe(true);
  await page.goto('/?view=calendar');
  await page.getByRole('button', {
    name: 'Termin Mobiler Dialog-Test öffnen'
  }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Termin bearbeiten'
  });
  await expect(dialog).toBeVisible();
  await expect(page.locator('.calendar-editor-dialog > footer')).toBeVisible();
  const viewportSafe = await dialog.evaluate(element => {
    const dialogBounds = element.getBoundingClientRect();
    const footerBounds = element.querySelector('footer').getBoundingClientRect();
    const actionBounds = Array.from(
      element.querySelectorAll('footer button:not([hidden])')
    ).map(button => button.getBoundingClientRect());
    return {
      dialogBottom: Math.ceil(dialogBounds.bottom),
      footerBottom: Math.ceil(footerBounds.bottom),
      actionBottom: Math.ceil(Math.max(...actionBounds.map(bounds => bounds.bottom))),
      viewportHeight: window.innerHeight
    };
  });
  expect(viewportSafe.dialogBottom).toBeLessThanOrEqual(viewportSafe.viewportHeight);
  expect(viewportSafe.footerBottom).toBeLessThanOrEqual(viewportSafe.viewportHeight);
  expect(viewportSafe.actionBottom).toBeLessThanOrEqual(
    viewportSafe.viewportHeight - 18
  );

  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await page.goto('/?view=meals');
  await page.getByRole('button', { name: 'Rezeptbuch (0)', exact: true }).click();
  await page.getByRole('button', { name: 'Neues Rezept', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Bild auswählen', exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Foto aufnehmen', exact: true })
  ).toBeVisible();
  await expect(
    page.locator('input[capture="environment"]')
  ).toHaveAttribute('accept', 'image/*');
});
