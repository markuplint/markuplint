import test from 'ava';
import parser from '../lib/parser';

test('empty', t => {
	const r = parser(``);
	const e = [];
	r.walk((n) => e.push(n.nodeName));
	t.is(e.join(), ``);
});

test('doctype', t => {
	const r = parser(`   <!doctype html>`);
	t.is(r.getNode(0).nodeName, '#documentType');
	t.is(r.getNode(0).publicId, null);
	t.is(r.getNode(0).dtd, null);
});

test('doctype', t => {
	const r = parser(`<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">`);
	t.is(r.getNode(0).publicId, '-//W3C//DTD HTML 4.01//EN');
	t.is(r.getNode(0).dtd, 'http://www.w3.org/TR/html4/strict.dtd');
});

test('//', t => {
	const r = parser(`<`);
	t.pass();
});
