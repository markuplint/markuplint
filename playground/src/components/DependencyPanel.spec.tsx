import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';

import { DependencyPanel } from './DependencyPanel';

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
		const versionSelect = screen.getByLabelText<HTMLSelectElement>(/Version/, { selector: 'select' });
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

	test('calls onChange when selecting a version', () => {
		const versionSelect = screen.getByLabelText<HTMLSelectElement>(/Version/, { selector: 'select' });
		fireEvent.change(versionSelect, { target: { value: 'next' } });
		expect(onChange).toHaveBeenCalledWith('next');
	});
});
