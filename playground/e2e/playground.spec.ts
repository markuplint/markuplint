import { test, expect, Page } from '@playwright/test';

test.setTimeout(2 * 60 * 1000);
const TIMEOUT_FOR_INSTALL = 60 * 1000;
const TIMEOUT_FOR_LOAD_SCHEMA = 60 * 1000;

const getPanels = async (page: Page) => {
	const codePanel = page.getByRole('region', { name: /Code/ });
	const codeEditor = codePanel.getByRole('textbox', { name: /Editor content/ });
	const configPanel = page.getByRole('region', { name: /Config/ });
	const problemsPanel = page.getByRole('region', { name: /Problems/ });
	return { codeEditor, configPanel, problemsPanel };
};

test.describe('Playground', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('Initial load', async ({ page }) => {
		const problemsPanel = page.getByRole('region', { name: /Problems/ });
		await expect(problemsPanel).toBeVisible();
		await expect(problemsPanel.getByRole('list')).toBeVisible({ timeout: TIMEOUT_FOR_INSTALL });
	});

	test('No problems', async ({ page }) => {
		const { codeEditor, problemsPanel } = await getPanels(page);
		// Delete all content
		await codeEditor.press('ControlOrMeta+a');
		await codeEditor.press('Delete');

		await expect(problemsPanel).toContainText('No problems found.', { timeout: TIMEOUT_FOR_INSTALL });
	});

	test('Select an example', async ({ page }) => {
		const { problemsPanel, configPanel, codeEditor } = await getPanels(page);
		const initialCode = await codeEditor.inputValue();
		await page.getByRole('button', { name: /Examples/ }).click();
		await page.getByRole('button', { name: /React/ }).click();
		await expect(configPanel).toBeVisible();
		await configPanel.getByRole('tab', { name: /Visual/ }).click();
		await expect(codeEditor).not.toHaveValue(initialCode);
		await expect(configPanel.getByRole('combobox', { name: 'Code file type:' })).toHaveValue('.jsx');
		await expect(configPanel.getByRole('checkbox', { name: 'markuplint:recommended-react' })).toBeChecked();
		await expect(problemsPanel.getByRole('list')).toBeVisible({ timeout: TIMEOUT_FOR_INSTALL });
	});

	test('Change config via visual editor', async ({ page }) => {
		const { codeEditor, configPanel, problemsPanel } = await getPanels(page);

		await codeEditor.press('ControlOrMeta+a');
		await codeEditor.press('Delete');
		await codeEditor.fill('<div attr attr></div>');
		await configPanel.getByRole('tab', { name: 'Visual' }).click();
		await configPanel.getByRole('checkbox', { name: 'markuplint:recommended', exact: true }).uncheck();
		await configPanel
			.getByRole('combobox', { name: 'attr-duplication' })
			.selectOption('true', { timeout: TIMEOUT_FOR_LOAD_SCHEMA });

		await configPanel.getByRole('tab', { name: 'JSON' }).click();
		const configEditor = configPanel.getByRole('textbox', { name: /Editor content/ });
		const configValue = (await configEditor.inputValue()).replace(/\s|\n/g, ''); // ignore the whitespacess
		expect(configValue).toMatch('{"rules":{"attr-duplication":true}}');
		await expect(problemsPanel.getByRole('list')).toBeVisible({ timeout: TIMEOUT_FOR_INSTALL });
	});
});
