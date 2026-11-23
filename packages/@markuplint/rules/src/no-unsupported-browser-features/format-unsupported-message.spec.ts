import { translator } from '@markuplint/i18n';
import { i18n } from 'markuplint';
import { describe, test, expect } from 'vitest';

import { __formatUnsupportedMessage } from './index.js';

describe('the browsers that a feature is not supported in', () => {
	const unsupported = [
		{ browser: 'chrome', displayName: 'Chrome', targetVersion: '30', addedVersion: '37' },
		{ browser: 'firefox', displayName: 'Firefox', targetVersion: '100', addedVersion: false, removedVersion: '4' },
		{ browser: 'ie', displayName: 'Internet Explorer', targetVersion: '11', addedVersion: false },
	] as const;

	test('added, removed and never supported are in Japanese with locale ja', () => {
		const t = translator(i18n('ja'));
		expect(__formatUnsupportedMessage(t, 'dialog', 'element', unsupported)).toBe(
			'要素「dialog」はChrome(37で追加、対象: 30), Firefox(4で削除済み), Internet Explorer(未サポート)ではサポートされていません',
		);
	});

	test('added, removed and never supported are as before in English', () => {
		const t = translator(i18n('en'));
		expect(__formatUnsupportedMessage(t, 'dialog', 'element', unsupported)).toBe(
			'the "dialog" element is not supported in Chrome (added in 37, target: 30), Firefox (removed in 4), Internet Explorer (not supported)',
		);
	});
});
