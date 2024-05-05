import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';

import { ExampleSelector } from './ExampleSelector';

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
HTMLDialogElement.prototype.show = vi.fn(function mock(this: HTMLDialogElement) {
	this.open = true;
});

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
HTMLDialogElement.prototype.showModal = vi.fn(function mock(this: HTMLDialogElement) {
	this.open = true;
});

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
HTMLDialogElement.prototype.close = vi.fn(function mock(this: HTMLDialogElement) {
	this.open = false;
});

const user = userEvent.setup();

describe('ExampleSelector', () => {
	const onSelect = vi.fn();
	const disabled = false;

	render(<ExampleSelector onSelect={onSelect} disabled={disabled} />);

	test('renders button', () => {
		const button = screen.getByRole('button', { name: /Examples\.{3}/ });
		expect(button).toBeInTheDocument();
	});

	test('opens dialog on button click', async () => {
		const button = screen.getByRole('button', { name: /Examples\.{3}/ });
		await user.click(button);
		const dialog = screen.getByRole('dialog');
		expect(dialog).toBeInTheDocument();
	});

	test('closes dialog on close button click', async () => {
		const closeButton = screen.getByRole('button', { name: /Close/ });
		await user.click(closeButton);
		const dialog = screen.queryByRole('dialog');
		expect(dialog).not.toBeInTheDocument();
	});

	test('calls onSelect and closes dialog on example button click', async () => {
		const button = screen.getByRole('button', { name: /Examples\.{3}/ });
		await user.click(button);
		const applyButton = screen.getByRole('button', { name: /React/ });
		await user.click(applyButton);
		expect(onSelect).toHaveBeenCalled();
		const dialog = screen.queryByRole('dialog');
		expect(dialog).not.toBeInTheDocument();
	});
});
