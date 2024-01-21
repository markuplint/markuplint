import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, test, expect, vi, afterEach } from 'vitest';

import { PresetsSelector } from './PresetsSelector';

const user = userEvent.setup();

const PresetsSelectorWithControllingComponent = ({
	value: defaultValue,
	onChange,
	...rest
}: Parameters<typeof PresetsSelector>[0]) => {
	const [value, setValue] = useState(defaultValue);
	vi.mocked(onChange!).mockImplementation(v => setValue(v));
	return <PresetsSelector value={value} onChange={onChange} {...rest} />;
};

describe('PresetsSelector', () => {
	const fileType = '.html';
	const value = ['markuplint:html-standard'];
	const onChange = vi.fn();

	afterEach(cleanup);

	test('renders presets', () => {
		render(<PresetsSelector fileType={'.html'} value={[]} />);
		const specificRecommendedPresetCheckbox = screen.getByLabelText('markuplint:recommended-static-html');
		expect(specificRecommendedPresetCheckbox).toBeTruthy();

		const recommendedPresetCheckbox = screen.getByLabelText('markuplint:recommended');
		expect(recommendedPresetCheckbox).toBeTruthy();

		const basePresetsCheckboxes = screen.getAllByLabelText(/^markuplint:/);
		expect(basePresetsCheckboxes.length).toBe(7);
	});

	test('calls onChange when base preset is checked', async () => {
		render(<PresetsSelectorWithControllingComponent fileType={fileType} value={[]} onChange={onChange} />);
		await user.click(screen.getByLabelText('markuplint:html-standard'));
		expect(onChange).toHaveBeenCalledWith(['markuplint:html-standard']);
		await user.click(screen.getByLabelText('markuplint:a11y'));
		expect(onChange).toHaveBeenCalledWith(['markuplint:html-standard', 'markuplint:a11y']);
	});

	test('when recommended preset is checked', async () => {
		render(<PresetsSelectorWithControllingComponent fileType={fileType} value={value} onChange={onChange} />);
		await user.click(screen.getByLabelText('markuplint:recommended'));
		expect(onChange).toHaveBeenCalledWith(['markuplint:recommended']);
		expect(screen.getAllByRole('checkbox', { checked: true }).length).toBe(6);
	});

	test('when specific recommended preset is checked', async () => {
		render(<PresetsSelectorWithControllingComponent fileType={fileType} value={value} onChange={onChange} />);
		await user.click(screen.getByLabelText('markuplint:recommended-static-html'));
		expect(onChange).toHaveBeenCalledWith(['markuplint:recommended-static-html']);
		expect(screen.getAllByRole('checkbox', { checked: true }).length).toBe(7);
	});

	test('calls onChange when checkbox is unchecked', async () => {
		render(<PresetsSelectorWithControllingComponent fileType={fileType} value={value} onChange={onChange} />);
		const specificRecommendedPresetCheckbox = screen.getByLabelText('markuplint:html-standard');
		await user.click(specificRecommendedPresetCheckbox);
		expect(onChange).toHaveBeenCalledWith([]);
	});

	describe('Besides HTML', () => {
		test('React', () => {
			render(<PresetsSelector fileType={'.jsx'} value={[]} />);
			const specificRecommendedPresetCheckbox = screen.getByLabelText('markuplint:recommended-react');
			expect(specificRecommendedPresetCheckbox).toBeTruthy();
		});

		test('Vue', () => {
			render(<PresetsSelector fileType={'.vue'} value={[]} />);
			const specificRecommendedPresetCheckbox = screen.getByLabelText('markuplint:recommended-vue');
			expect(specificRecommendedPresetCheckbox).toBeTruthy();
		});
	});
});
