import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';

import { DependencyPanel } from './DependencyPanel';

const user = userEvent.setup();

describe('DependencyPanel', () => {
	const depsPackages = new Set<string>(['markuplint', '@markuplint/svelte-parser']);
	const installedPackages = { markuplint: '^3.15.0', '@markuplint/svelte-parser': '^3.12.0' };
	const onChange = vi.fn();

	render(
		<DependencyPanel
			depsPackages={depsPackages}
			installedPackages={installedPackages}
			status="success"
			onChange={onChange}
		/>,
	);

	test('default value', () => {
		const versionSelect = screen.getByRole<HTMLSelectElement>('combobox', { name: /Version/ });
		expect(versionSelect.value).toBe('latest');
	});

	test('renders install command', () => {
		const installCommand = screen.getByText(/npm install -D markuplint@latest @markuplint\/svelte-parser@latest/);
		expect(installCommand).toBeTruthy();
	});

	test('renders package.json content based on status', () => {
		const packageJsonContent = screen.getByText(/"devDependencies":/);
		expect(packageJsonContent).toBeTruthy();
	});

	test('calls onChange when selecting a version', async () => {
		const versionSelect = screen.getByLabelText<HTMLSelectElement>(/Version/, { selector: 'select' });
		await user.selectOptions(versionSelect, 'next');
		expect(onChange).toHaveBeenCalledWith('next');
	});
});
