const {
	isStartsHeadTagOrBodyTag,
	optimizeStartsHeadTagOrBodyTagSetup,
} = require('../lib/optimize-starts-head-or-body');

test('isStartsHeadTagOrBodyTag', () => {
	expect(isStartsHeadTagOrBodyTag('<head>')).toBeTruthy();
	expect(isStartsHeadTagOrBodyTag(' <head>')).toBeTruthy();
	expect(isStartsHeadTagOrBodyTag('<body>')).toBeTruthy();
	expect(isStartsHeadTagOrBodyTag(' <body>')).toBeTruthy();
	expect(isStartsHeadTagOrBodyTag('<html>')).toBeFalsy();
	expect(isStartsHeadTagOrBodyTag('<!doctype>')).toBeFalsy();
});

test('optimizeStartsHeadTagOrBodyTagSetup', () => {
	expect(
		optimizeStartsHeadTagOrBodyTagSetup(
			'<head attr></Head></head><body>body</head>head<body></BODY attr><headline />',
		),
	).toStrictEqual({
		heads: ['head', 'Head', 'head', 'head'],
		bodies: ['body', 'body', 'BODY'],
		code: '<x-�h attr></x-�h></x-�h><x-�b>body</x-�h>head<x-�b></x-�b attr><headline />',
	});
});
