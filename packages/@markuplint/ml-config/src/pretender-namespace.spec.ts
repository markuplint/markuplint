import { describe, test, expect } from 'vitest';

import { pretenderNamespaceToURI, uriToPretenderNamespace } from './pretender-namespace.js';

describe('pretender namespace', () => {
	test('each name maps to its namespace URI', () => {
		expect(pretenderNamespaceToURI('html')).toBe('http://www.w3.org/1999/xhtml');
		expect(pretenderNamespaceToURI('svg')).toBe('http://www.w3.org/2000/svg');
		expect(pretenderNamespaceToURI('math')).toBe('http://www.w3.org/1998/Math/MathML');
	});

	test('each namespace URI of an element maps to its name', () => {
		expect(uriToPretenderNamespace('http://www.w3.org/1999/xhtml')).toBe('html');
		expect(uriToPretenderNamespace('http://www.w3.org/2000/svg')).toBe('svg');
		expect(uriToPretenderNamespace('http://www.w3.org/1998/Math/MathML')).toBe('math');
	});

	test('a namespace URI of no element has no name', () => {
		expect(uriToPretenderNamespace('http://www.w3.org/1999/xlink')).toBeUndefined();
	});
});
