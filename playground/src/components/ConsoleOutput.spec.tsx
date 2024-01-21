import type { ConsoleOutputRef } from './ConsoleOutput';

import { cleanup, render, screen } from '@testing-library/react';
import { describe, test, expect, afterEach } from 'vitest';

import { ConsoleOutput } from './ConsoleOutput';

describe('ConsoleOutput', () => {
	let consoleOutputRef: ConsoleOutputRef | null = null;

	afterEach(() => {
		cleanup();
	});

	test('renders without errors', () => {
		render(<ConsoleOutput ref={ref => (consoleOutputRef = ref)} />);
		expect(screen.getByRole('textbox')).toBeInTheDocument();
		expect(consoleOutputRef).not.toBeNull();
	});
});
