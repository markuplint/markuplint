import { test } from '@playwright/test';

const TARGET_PAGES = [
  '/',
  '/docs/guides/selectors',
  '/docs/rules',
  '/docs/rules/permitted-contents',
  '/docs/configuration',
  '/community',
];

for (const pagePath of TARGET_PAGES) {
  test(`screenshot ${pagePath}`, async ({ page }) => {
    await page.goto(pagePath);
    await page.waitForSelector('footer'); // without this, the whole page cannot be captured
    await page.screenshot({
      path: `__screenshots__/${(pagePath === '/' ? '/index' : pagePath).replaceAll('/', '_')}.png`,
      fullPage: true,
    });
  });
}
