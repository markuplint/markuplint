import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';

import { FileTypeSelector } from './FileTypeSelector';

const user = userEvent.setup();

describe('FileTypeSelector', () => {
	const value = '.html';
	const onChange = vi.fn();

	render(<FileTypeSelector value={value} onChange={onChange} />);

	test('renders select element with correct value', () => {
		const selectElement = screen.getByRole<HTMLSelectElement>('combobox', { name: /Code file type/ });
		expect(selectElement.value).toBe(value);
	});

	test('calls onChange when selecting a different value', async () => {
		const selectElement = screen.getByRole<HTMLSelectElement>('combobox', { name: /Code file type/ });
		const newValue = '.vue';
		await user.selectOptions(selectElement, newValue);
		expect(onChange).toHaveBeenCalledWith(newValue);
	});

	test('renders learn more link with correct href', () => {
		const learnMoreLink = screen.getByText(/Learn more about using to besides HTML/);
		expect(learnMoreLink).toHaveAttribute('href', 'https://markuplint.dev/docs/guides/besides-html');
	});

	test('renders learn more link with correct target and rel attributes', () => {
		const learnMoreLink = screen.getByText(/Learn more about using to besides HTML/);
		expect(learnMoreLink).toHaveAttribute('target', '_blank');
		expect(learnMoreLink).toHaveAttribute('rel', 'noreferrer');
	});
});
