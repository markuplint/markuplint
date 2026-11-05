// @ts-nocheck

import { test, expect } from 'vitest';

import { checkSerializedPermissionsPolicy } from './check-serialized-permissions-policy.js';

const check = checkSerializedPermissionsPolicy();

test('checkSerializedPermissionsPolicy', () => {
	expect(check('').matched).toBe(true);
	expect(check(' ').matched).toBe(true);
	// A feature token without an allowlist is a valid entry.
	expect(check('a').matched).toBe(true);
	expect(check('a:').reason).toBe('unexpected-token');
	// ASCII whitespace after a feature token is stripped.
	expect(check('a ').matched).toBe(true);
	expect(check('a a').reason).toBe('unexpected-token');
	expect(check('a *').matched).toBe(true);
	expect(check('a *a').reason).toBe('unexpected-token');
	expect(check('a none').reason).toBe('missing-token');
	expect(check("a 'none'").matched).toBe(true);
	expect(check('a https://markuplint.dev').matched).toBe(true);
	expect(check('a https://markuplint.dev/path/to').reason).toBe('extra-token');
	expect(check('a https://マルチバイト.abc.xyz').reason).toBe('must-be-serialized');
	expect(check('a * https://markuplint.dev').matched).toBe(true);
	expect(check("a * https://markuplint.dev 'none'").reason).toBe('illegal-combination');
	expect(check("a * https://markuplint.dev 'none';b").reason).toBe('illegal-combination');
	expect(check("a * https://markuplint.dev 'none';b ").reason).toBe('illegal-combination');
	expect(check("a * https://markuplint.dev 'none';b *").reason).toBe('illegal-combination');
	expect(check("a * https://markuplint.dev 'none';b *;c 'none'").reason).toBe('illegal-combination');
	expect(check("a * https://markuplint.dev 'none'; b *; c 'none'").reason).toBe('illegal-combination');
});

test('YouTube embed', () => {
	expect(
		check('accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture').matched,
	).toBe(true);
});

test.each([
	[''],
	[' '],
	['camera;'],
	['camera; '],
	['camera;;microphone'],
	['camera; ;microphone'],
	[';camera'],
	['\t\n\f\r '],
	[' camera ; microphone '],
])('accepts %j because every entry is empty or valid once ASCII whitespace is stripped', value => {
	expect(check(value).matched).toBe(true);
});

test.each([
	["camera 'none' 'self'"],
	["camera 'self' 'none'"],
	["camera 'none' 'none'"],
	["camera 'NONE' *"],
	["camera https://example.com 'none'"],
])("rejects %j because 'none' is only valid as the whole allowlist", value => {
	const res = check(value);
	expect(res.matched).toBe(false);
	expect(res.reason).toBe('illegal-combination');
});

test.each([["camera 'none'"], ["camera 'NONE'"], ["camera 'none' "], ["camera; microphone 'none'"]])(
	"accepts %j because 'none' is the whole allowlist of its entry",
	value => {
		expect(check(value).matched).toBe(true);
	},
);

test.each([
	["camera 'self'; camera 'none'"],
	['camera; camera'],
	['camera; microphone; camera *'],
	['camera ;camera'],
	['camera ; ; camera'],
])('rejects %j because the same feature token appears in more than one entry', value => {
	const res = check(value);
	expect(res.matched).toBe(false);
	expect(res.reason).toBe('duplicated');
});

test.each([
	['camera;microphone'],
	['camera *; microphone *'],
	['camera; camera-x'],
	['fullscreen; picture-in-picture'],
])('accepts %j because every feature token appears once', value => {
	expect(check(value).matched).toBe(true);
});

test.each([['camera\u3000*'], ['camera\u00A0*'], ['camera\u000B*'], ['\u3000camera'], ['camera\u2003']])(
	'rejects %j because only ASCII whitespace separates tokens',
	value => {
		const res = check(value);
		expect(res.matched).toBe(false);
		expect(res.reason).toBe('unexpected-token');
	},
);

test.each([['camera\t*'], ["camera\n*\r'self'"], ['camera\f*'], ["\tcamera\t*\n;\nmicrophone 'src'\n"]])(
	'accepts %j because ASCII whitespace separates tokens',
	value => {
		expect(check(value).matched).toBe(true);
	},
);

test.each([
	['camera https://a,b.example'],
	["camera https://a'b.example"],
	['camera https://example.com/'],
	['camera https://example.com:8080'],
	['camera http://[::1]'],
	['camera ftp://example.com'],
	['camera wss://example.com'],
])('accepts %j as the serialization of a non-opaque origin', value => {
	expect(check(value).matched).toBe(true);
});

test.each([["camera 'SELF'"], ["camera 'SRC' 'Self'"], ["camera 'self' 'src' * https://example.com"]])(
	'accepts %j because the keywords are matched ASCII case-insensitively',
	value => {
		expect(check(value).matched).toBe(true);
	},
);

test.each([['camera SELF'], ['camera Src'], ['camera none']])(
	'rejects %j because a keyword needs its single quotes',
	value => {
		const res = check(value);
		expect(res.matched).toBe(false);
		expect(res.reason).toBe('missing-token');
		expect(res.partName).toBe('keyword');
	},
);

test.each([['Camera'], ['camera; Camera'], ['CAMERA *'], ['camera:'], ['camera_x']])(
	'rejects %j because a feature token is made of lowercase ASCII letters, digits and hyphens',
	value => {
		const res = check(value);
		expect(res.matched).toBe(false);
		expect(res.reason).toBe('unexpected-token');
		expect(res.partName).toBe('feature-identifier');
	},
);

test("rejects a value glued to the end of 'none'", () => {
	const res = check("camera 'none'x");
	expect(res.matched).toBe(false);
	expect(res.reason).toBe('unexpected-token');
});

test('reports the position of the second entry that repeats a feature token', () => {
	const res = check('camera; camera');
	expect(res).toMatchObject({ matched: false, reason: 'duplicated', raw: 'camera', offset: 8, line: 1, column: 9 });
});

test("suggests 'none' only for the first value of an allowlist", () => {
	const values = (value: string) => check(value).expects.map(item => item.value);
	expect(values('camera foo')).toContain("'none'");
	expect(values("camera 'self' foo")).not.toContain("'none'");
});

test.each([
	['camera https://*.example.com', 'unexpected-token'],
	['camera https://example.com:443', 'must-be-serialized'],
	['camera https://a%2Cb.example', 'must-be-serialized'],
	['camera HTTPS://Example.com', 'must-be-serialized'],
	['camera https://user@example.com', 'extra-token'],
	['camera https://example.com/path', 'extra-token'],
	['camera https://example.com?q', 'extra-token'],
	['camera https://example.com#h', 'extra-token'],
	['camera https://example.com?', 'extra-token'],
	['camera https://example.com#', 'extra-token'],
	['camera file:///', 'unexpected-token'],
	['camera file://host/', 'unexpected-token'],
	['camera custom://host', 'unexpected-token'],
	['camera data:text/html,x', 'unexpected-token'],
	['camera about:blank', 'unexpected-token'],
	['camera blob:https://example.com/id', 'unexpected-token'],
])(
	'rejects %j (%s) because it is not the serialization of a non-opaque origin with a wildcard-free host',
	(value, reason) => {
		const res = check(value);
		expect(res.matched).toBe(false);
		expect(res.reason).toBe(reason);
	},
);
