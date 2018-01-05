import test from 'ava';
import parser from '../../lib/parser';

test((t) => {
	const d = parser('<!DOCTYPE html>');
	t.is(d.list[0].type, 'Doctype');
	t.is(d.list[1].nodeName, 'html');
	t.is(d.list[2].nodeName, 'head');
	t.is(d.list[3].nodeName, 'body');
	t.is(d.list.length, 4);
});

test((t) => {
	// ❌
	const d = parser('<!DOCTYPE html> ');
	t.is(d.list[0].type, 'Doctype');
	t.is(d.list[1].nodeName, 'html');
	t.is(d.list[2].nodeName, 'head');
	t.is(d.list[3].nodeName, 'body');
	t.is(d.list.length, 4);
});

test((t) => {
	// ❌
	const d = parser('<!DOCTYPE html>\n');
	t.is(d.list[0].type, 'Doctype');
	t.is(d.list[1].nodeName, 'html');
	t.is(d.list[2].nodeName, 'head');
	t.is(d.list[3].nodeName, 'body');
	t.is(d.list.length, 4);
});

test((t) => {
	const d = parser('<!DOCTYPE html>text');
	t.is(d.list[0].type, 'Doctype');
	t.is(d.list[1].nodeName, 'html');
	t.is(d.list[2].nodeName, 'head');
	t.is(d.list[3].nodeName, 'body');
	t.is(d.list[4].type, 'Text');
	t.is(d.list[4].col, 16);
	t.is(d.list.length, 5);
});

test((t) => {
	// ❌
	const d = parser('<!DOCTYPE html> text');
	t.is(d.list[0].type, 'Doctype');
	t.is(d.list[1].nodeName, 'html');
	t.is(d.list[2].nodeName, 'head');
	t.is(d.list[3].nodeName, 'body');
	t.is(d.list[4].type, 'Text');
	t.is(d.list[4].raw, 'text');
	t.is(d.list[4].col, 17);
	t.is(d.list.length, 5);
	t.is(d.toString(), '<!DOCTYPE html>text');
});

test((t) => {
	// ❌
	const d = parser('<!DOCTYPE html>\ntext');
	t.is(d.list[0].type, 'Doctype');
	t.is(d.list[1].nodeName, 'html');
	t.is(d.list[2].nodeName, 'head');
	t.is(d.list[3].nodeName, 'body');
	t.is(d.list[4].type, 'Text');
	t.is(d.list[4].raw, 'text');
	t.is(d.list[4].col, 1);
	t.is(d.list.length, 5);
	t.is(d.toString(), '<!DOCTYPE html>text');
});

test((t) => {
	const d = parser('<!DOCTYPE html>\n<p>text');
	t.is(d.list[0].type, 'Doctype');
	t.is(d.list[1].nodeName, 'html');
	t.is(d.list[2].nodeName, 'head');
	t.is(d.list[3].nodeName, 'body');
	t.is(d.list[4].nodeName, 'p');
	t.is(d.list[5].type, 'Text');
	t.is(d.list[5].raw, 'text');
	t.is(d.list[5].col, 4);
	t.is(d.list.length, 6);
	// ❌
	t.is(d.toString(), '<!DOCTYPE html><p>text');
});

test((t) => {
	const d = parser('<!DOCTYPE html><p>\ntext');
	t.is(d.list[0].type, 'Doctype');
	t.is(d.list[1].nodeName, 'html');
	t.is(d.list[2].nodeName, 'head');
	t.is(d.list[3].nodeName, 'body');
	t.is(d.list[4].nodeName, 'p');
	t.is(d.list[5].type, 'Text');
	t.is(d.list[5].raw, '\ntext');
	t.is(d.list[5].col, 19);
	t.is(d.list.length, 6);
	t.is(d.toString(), '<!DOCTYPE html><p>\ntext');
});

test((t) => {
	// ❌
	const d = parser('<!DOCTYPE html>\n<html>text');
	t.is(d.list[0].type, 'Doctype');
	t.is(d.list[1].nodeName, 'html');
	t.is(d.list[2].nodeName, 'head');
	t.is(d.list[3].nodeName, 'body');
	t.is(d.list[4].type, 'Text');
	t.is(d.list[4].raw, 'text');
	t.is(d.list[4].col, 7);
	t.is(d.list.length, 5);
	t.is(d.toString(), '<!DOCTYPE html><html>text');
});

test((t) => {
	// ❌
	const d = parser('<!DOCTYPE html><html>\ntext');
	t.is(d.list[0].type, 'Doctype');
	t.is(d.list[1].nodeName, 'html');
	t.is(d.list[2].nodeName, 'head');
	t.is(d.list[3].nodeName, 'body');
	t.is(d.list[4].type, 'Text');
	t.is(d.list[4].raw, 'text');
	t.is(d.list[4].col, 1);
	t.is(d.list.length, 5);
	t.is(d.toString(), '<!DOCTYPE html><html>text');
});

test((t) => {
	const d = parser('');
	t.is(d.list[0].nodeName, 'html');
	t.is(d.list[1].nodeName, 'head');
	t.is(d.list[2].nodeName, 'body');
	t.is(d.list.length, 3);
	t.is(d.toString(), '');
});

test((t) => {
	const d = parser('<html>');
	t.is(d.list[0].nodeName, 'html');
	t.is(d.list[1].nodeName, 'head');
	t.is(d.list[2].nodeName, 'body');
	t.is(d.list.length, 3);
	t.is(d.toString(), '<html>');
});

test((t) => {
	// ❌
	const d = parser('<html></body>');
	t.is(d.list[0].nodeName, 'html');
	t.is(d.list[1].nodeName, 'head');
	t.is(d.list[2].nodeName, 'body');
	t.is(d.list.length, 3);
	t.is(d.toString(), '<html>');
});

test((t) => {
	// ❌
	const d = parser('<html>invalid-before-text<body>text</body>invalid-after-text</html>');
	t.is(d.list[0].nodeName, 'html');
	t.is(d.list[1].nodeName, 'head');
	t.is(d.list[2].nodeName, 'body');
	t.is(d.list[3].nodeName, '#text');
	t.is(d.list[4].nodeName, 'html');
	t.is(d.list.length, 5);
	t.is(d.toString(), '<html>invalid-before-text<body>text</body>invalid-after-text</html>');
});

test('noop', (t) => t.pass());
