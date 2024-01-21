import * as React from 'react';
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

vi.mock('@monaco-editor/react', () => {
	const FakeEditor = vi.fn(props => (
		<textarea
			data-auto={props.wrapperClassName}
			onChange={e => props.onChange(e.target.value)}
			value={props.value}
		></textarea>
	));
	return {
		default: FakeEditor,
	};
});

global.matchMedia = vi.fn().mockImplementation(() => ({
	matches: false,
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	dispatchEvent: vi.fn(),
	addListener: vi.fn(), // Deprecated
	removeListener: vi.fn(), // Deprecated
}));
