import { test, expect } from '@playwright/test';

test('Travel book availability', async ({ page }) => {
  // Go to home page
    await page.goto('https://books.toscrape.com/');

  // Click on the "Travel" category
    await page.getByRole('link', { name: 'Travel' }).click();

  // Click on "It's Only the Himalayas" book
    await page.getByRole('link', { name: "It's Only the Himalayas" }).first().click();

  // Verify the "In stock (19 available)" label is present
    await expect(page.locator('p', { hasText: 'In stock (19 available)' })).toBeVisible();
});
