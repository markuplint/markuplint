import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ComponentProps } from 'react';
import { describe, expect, test, vi } from 'vitest';

import { CodeEditor } from './CodeEditor';

const ControllingComponent = ({ value: defaultValue, onChange, ...rest }: ComponentProps<typeof CodeEditor>) => {
	const [value, setValue] = useState(defaultValue);
	vi.mocked(onChange!).mockImplementation(v => setValue(v));
	return <CodeEditor value={value} onChange={onChange} {...rest} />;
};

const user = userEvent.setup();

describe('CodeEditor', () => {
	const value = '<div>initial code</div>';
	const filename = 'example.html';
	const violations: ComponentProps<typeof CodeEditor>['violations'] = [];
	const onChange = vi.fn();
	render(<ControllingComponent value={value} filename={filename} violations={violations} onChange={onChange} />);

	test('renders code editor with correct filename', () => {
		const filenameElement = screen.getByText(filename);
		expect(filenameElement).toBeInTheDocument();
	});

	test('calls onChange when code is changed', async () => {
		const codeEditor = screen.getByRole('textbox');
		await user.clear(codeEditor);
		await user.type(codeEditor, '<span>Modified code</span>');
		expect(onChange).toHaveBeenCalledWith('<span>Modified code</span>');
	});
});
