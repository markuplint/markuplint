import { MLEngine } from 'markuplint';
import { describe, expect, test } from 'vitest';

import { ariaPropLabel } from './aria-prop-label.js';
import { getAccessibilityByLocation } from './get-accessibility-by-location.js';

const REQUIRED = '(required)';

describe('ariaPropLabel', () => {
	test.each([
		[{ value: '5', required: true, from: 'aria-attr' as const }, '`5`'],
		[{ value: null, required: true, from: 'default' as const }, `Undefined ${REQUIRED}`],
		[{ value: '50', required: true, from: 'default' as const }, `\`50\` ${REQUIRED}`],
		[{ value: 'true', required: true, from: 'html-attr' as const }, '`true`'],
		[{ value: null, required: true, satisfiedByElement: true as const, from: 'default' as const }, 'Undefined'],
		[{ value: null, required: false, from: 'default' as const }, 'Undefined'],
		// An older engine gives no `from`
		[{ value: null, required: true }, `Undefined ${REQUIRED}`],
		[{ value: undefined, required: true }, `Undefined ${REQUIRED}`],
		[{ value: '5', required: true }, '`5`'],
	])('%j', (prop, label) => {
		expect(ariaPropLabel(prop, REQUIRED)).toBe(label);
	});

	test.each([
		// The author has to write it: an explicit role that may be focusable
		['<div role="separator" tabindex="0"></div>', '1.3', 'valuenow', `Undefined ${REQUIRED}`],
		// The implicit value of ARIA 1.1 is shown, and the author still has to write it
		['<div role="separator" tabindex="0"></div>', '1.1', 'valuenow', `\`50\` ${REQUIRED}`],
		['<div role="separator" tabindex="0" aria-valuenow="5"></div>', '1.1', 'valuenow', '`5`'],
		// The implicit role of the element satisfies it
		['<hr tabindex="0">', '1.3', 'valuenow', 'Undefined'],
		// The default keyword of aria-checked is not written by the author
		['<input type="checkbox" role="switch">', '1.3', 'checked', `\`undefined\` ${REQUIRED}`],
		// The checked attribute gives it in its place
		['<input type="checkbox" role="switch" checked>', '1.3', 'checked', '`true`'],
	] as const)('%s (ARIA %s): %s', async (code, version, propName, label) => {
		const engine = await MLEngine.fromCode(code, { name: 'a.html' });
		await engine.exec();
		const result = await getAccessibilityByLocation(engine, 1, 2, version);
		const aria = result?.aria;
		const prop = aria && !('unknown' in aria && aria.unknown) ? aria.props?.[propName] : undefined;
		expect(prop).toBeDefined();
		expect(ariaPropLabel(prop!, REQUIRED)).toBe(label);
	});
});
