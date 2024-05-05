import type { JSONSchema } from '../modules/json-schema';

import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, afterEach } from 'vitest';

import { rules } from '../../__mocks__/rule';

import { RuleConfig } from './RuleConfig';

const user = userEvent.setup();

describe('RuleConfig', () => {
	const value = true;
	const ruleName = 'attr-duplication';
	const schema = rules.oneOf[0].properties!['attr-duplication'] as JSONSchema;
	const onChange = vi.fn();

	afterEach(() => {
		cleanup();
	});

	test('renders rule name', () => {
		render(<RuleConfig value={value} ruleName={ruleName} schema={schema} onChange={onChange} />);
		const ruleNameElement = screen.getByRole('heading', { name: /attr-duplication/ });
		expect(ruleNameElement).toBeTruthy();
		const ruleNameLink = screen.getByRole('link', { name: /attr-duplication/ });
		expect(ruleNameLink).toBeTruthy();
	});

	test('renders select element', () => {
		render(<RuleConfig value={value} ruleName={ruleName} schema={schema} onChange={onChange} />);
		const selectElement = screen.getByRole<HTMLSelectElement>('combobox');
		expect(selectElement).toBeTruthy();
	});

	test('calls onChange when selecting a value', async () => {
		render(<RuleConfig value={value} ruleName={ruleName} schema={schema} onChange={onChange} />);
		const selectElement = screen.getByRole<HTMLSelectElement>('combobox');
		await user.selectOptions(selectElement, 'false');
		expect(onChange).toHaveBeenCalledWith('attr-duplication', false);
	});
});
