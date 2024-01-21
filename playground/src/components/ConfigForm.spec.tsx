import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';

import { ConfigForm } from './ConfigForm';

describe('ConfigForm', () => {
	const fileType = '.jsx';
	const config = {
		parser: { '\\.jsx$': '@markuplint/jsx-parser' },
		specs: { '\\.jsx$': '@markuplint/react-spec' },
		rules: {
			'attr-duplication': false,
		},
		extends: ['markuplint:recommended'],
	};
	const version = '3.0.0';
	const onChangeFileType = vi.fn();
	const onChangeConfig = vi.fn();

	render(
		<ConfigForm
			fileType={fileType}
			config={config}
			version={version}
			onChangeFileType={onChangeFileType}
			onChangeConfig={onChangeConfig}
		/>,
	);

	test('renders sections', () => {
		const fileTypeSelector = screen.getAllByRole('heading', { level: 3 });
		expect(fileTypeSelector.length).toBe(3);
	});
});
