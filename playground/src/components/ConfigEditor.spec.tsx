import type { ComponentProps } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, test, expect, vi } from 'vitest';

import { ConfigEditor } from './ConfigEditor';

const ControllingComponent = ({ value: defaultValue, onChange, ...rest }: ComponentProps<typeof ConfigEditor>) => {
	const [value, setValue] = useState(defaultValue);
	vi.mocked(onChange!).mockImplementation(v => setValue(v));
	return <ConfigEditor value={value} onChange={onChange} {...rest} />;
};

/** @see https://testing-library.com/docs/user-event/keyboard/ */
const escapeInput = (value: string) => value.replaceAll('{', '{{').replaceAll('}', '}}');

const user = userEvent.setup();

describe('ConfigEditor', () => {
	const value = '{ "key": "value" }';
	const onChange = vi.fn();
	render(<ControllingComponent value={value} onChange={onChange} />);

	test('renders the editor with the provided value', () => {
		const editor = screen.getByRole<HTMLInputElement>('textbox');
		expect(editor.value).toBe(value);
	});

	test('calls onChange when the editor value changes', async () => {
		const editor = screen.getByRole('textbox');
		const newValue = '{ "key": "new value" }';
		await user.clear(editor);
		await user.type(editor, escapeInput(newValue));
		expect(onChange).toHaveBeenCalledWith(newValue);
	});
});
