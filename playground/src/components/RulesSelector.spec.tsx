import { render, screen, cleanup, waitForElementToBeRemoved } from '@testing-library/react';
import { describe, test, expect, vi, afterEach } from 'vitest';

import { schema } from '../../__mocks__/schema';

import { RulesSelector } from './RulesSelector';

vi.mock('../modules/json-schema', async () => ({
	...(await vi.importActual('../modules/json-schema')),
	fetchDereferencedSchema: vi.fn().mockResolvedValue(schema),
}));

describe('RulesSelector', () => {
	const value = {};
	const version = '3.15.0';
	const onChange = vi.fn();

	afterEach(() => {
		cleanup();
	});

	test('renders loading message while fetching schema', () => {
		render(<RulesSelector value={value} version={version} onChange={onChange} />);
		const loadingMessage = screen.getByText(/loading schema.../i);
		expect(loadingMessage).toBeInTheDocument();
	});

	test('renders rule config components after fetching schema', async () => {
		render(<RulesSelector value={value} version={version} onChange={onChange} />);

		await waitForElementToBeRemoved(() => screen.queryByText(/loading schema.../i));
		expect(screen.getByText(/attr-duplication/)).toBeInTheDocument();
	});
});
