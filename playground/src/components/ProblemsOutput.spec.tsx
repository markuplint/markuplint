import type { ComponentProps } from 'react';

import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';

import { ProblemsOutput } from './ProblemsOutput';

const mockViolations: ComponentProps<typeof ProblemsOutput>['violations'] = [
	{
		severity: 'info',
		message: 'Info message',
		ruleId: 'rule1',
		line: 1,
		col: 1,
		raw: 'raw code',
	},
	{
		severity: 'warning',
		message: 'Warning message',
		ruleId: 'rule2',
		line: 2,
		col: 2,
		raw: 'raw code',
	},
	{
		severity: 'error',
		message: 'Error message',
		ruleId: 'rule3',
		line: 3,
		col: 3,
		raw: 'raw code',
	},
];

describe('ProblemsOutput', () => {
	test('renders loading message when violations is null', () => {
		render(<ProblemsOutput violations={null} />);
		const loadingMessage = screen.getByText(/Loading.../);
		expect(loadingMessage).toBeInTheDocument();
	});

	test('renders no problems found message when violations is an empty array', () => {
		render(<ProblemsOutput violations={[]} />);
		const noProblemsMessage = screen.getByText(/No problems found./);
		expect(noProblemsMessage).toBeInTheDocument();
	});

	test('renders the correct number of violations', () => {
		render(<ProblemsOutput violations={mockViolations} />);
		const violationItems = screen.getAllByRole('listitem');
		expect(violationItems).toHaveLength(mockViolations.length);
	});
});
