import type { MLMLSpec } from '@markuplint/ml-spec';

import htmlSpec from '@markuplint/html-spec';
import { ARIA_RECOMMENDED_VERSION, getComputedRole, schemaToSpec } from '@markuplint/ml-spec';
import { describe, test, expect } from 'vitest';

import { createTestDocument } from '../../test/index.js';

import { MLShadowRoot } from './shadow-root.js';

/**
 * The tree of an element is the one its `getRootNode()` returns: the document, the content of
 * an HTML `template` element, or a declarative shadow root.
 *
 * @see https://dom.spec.whatwg.org/#concept-tree
 */

/**
 * Fails the test when the value is missing, so that an assertion on what follows is never made
 * against nothing.
 *
 * @param value - What a lookup returned
 * @returns The value
 */
function must<T>(value: T | null | undefined): T {
	expect(value).not.toBeNull();
	expect(value).not.toBeUndefined();
	return value as T;
}

function firstTemplate(code: string) {
	const doc = createTestDocument(code);
	return { doc, template: must(doc.deepQuerySelectorAll('template')[0]) };
}

describe('queries do not enter the content of a template', () => {
	test('the document does not find an element in the content', () => {
		const doc = createTestDocument('<div><p id="a"></p></div><template><p id="b"></p></template>');
		expect([...doc.querySelectorAll('p')].map(el => el.id)).toStrictEqual(['a']);
		expect(must(doc.querySelector('template')).localName).toBe('template');
		expect(doc.getElementById('b')).toBeNull();
	});

	test('an element does not find an element in the content of a template under it', () => {
		const doc = createTestDocument('<div><p id="a"></p><template><p id="b"></p></template></div>');
		const div = must(doc.querySelector('div'));
		expect([...div.querySelectorAll('p')].map(el => el.id)).toStrictEqual(['a']);
		expect([...div.getElementsByTagName('p')].map(el => el.id)).toStrictEqual(['a']);
		expect([...div.getElementsByClassName('x')].length).toBe(0);
	});

	test('a nested template is a boundary too', () => {
		const doc = createTestDocument('<template><template><p id="b"></p></template></template>');
		const content = must(must(doc.querySelector('template')).content);
		expect(content.querySelector('p')).toBeNull();
		expect(must(must(content.querySelector('template')).content).querySelector('p')?.id).toBe('b');
	});

	test('the results are in tree order, the ancestor first', () => {
		const doc = createTestDocument('<div id="a"><p id="a"></p></div>');
		expect(must(doc.getElementById('a')).localName).toBe('div');
		expect([...doc.querySelectorAll('[id]')].map(el => el.localName)).toStrictEqual(['div', 'p']);
	});

	test('a template has no descendants to query: what it holds is its content', () => {
		const doc = createTestDocument('<template><p></p></template>');
		const template = must(doc.querySelector('template'));
		expect(template.querySelectorAll('p').length).toBe(0);
		expect(template.getElementsByTagName('p').length).toBe(0);
	});
});

describe('getElementById', () => {
	test('finds an id that is not a valid CSS identifier', () => {
		const doc = createTestDocument('<div id="a.b:c"></div><div id="1"></div>');
		expect(must(doc.getElementById('a.b:c')).localName).toBe('div');
		expect(must(doc.getElementById('1')).localName).toBe('div');
	});

	test('compares the id with its character references resolved', () => {
		const doc = createTestDocument('<div id="&#97;&amp;b"></div>');
		expect(must(doc.getElementById('a&b')).localName).toBe('div');
	});

	test('does not find an empty id', () => {
		const doc = createTestDocument('<div id=""></div>');
		expect(doc.getElementById('')).toBeNull();
	});

	test('a fragment finds an element in its own tree only', () => {
		const doc = createTestDocument('<p id="a"></p><template><p id="b"></p></template>');
		const content = must(must(doc.querySelector('template')).content);
		expect(must(content.getElementById('b')).localName).toBe('p');
		expect(content.getElementById('a')).toBeNull();
		expect(content.getElementById('')).toBeNull();
	});
});

describe('getElementsByClassName', () => {
	test('matches the class, not a type selector', () => {
		const doc = createTestDocument('<div class="foo"></div><foo></foo>');
		expect([...doc.getElementsByClassName('foo')].map(el => el.localName)).toStrictEqual(['div']);
	});

	test('requires every class of a list', () => {
		const doc = createTestDocument('<p class="a b"></p><p class="a"></p>');
		expect([...doc.getElementsByClassName('a b')].length).toBe(1);
	});

	test('finds nothing for an empty list', () => {
		const doc = createTestDocument('<p class="a"></p>');
		expect(doc.getElementsByClassName('').length).toBe(0);
		expect(doc.getElementsByClassName(' \t').length).toBe(0);
	});
});

describe('getElementsByTagName', () => {
	test('does not enter the content of a template', () => {
		const doc = createTestDocument('<p id="a"></p><template><p id="b"></p></template>');
		expect([...doc.getElementsByTagName('p')].map(el => el.id)).toStrictEqual(['a']);
	});
});

describe('the content of a template', () => {
	test('is a document fragment that holds the children', () => {
		const doc = createTestDocument('<template><p id="a"></p>text</template>');
		const template = must(doc.querySelector('template'));
		const content = must(template.content);
		expect(template.isHTMLTemplateElement).toBe(true);
		expect(content.nodeType).toBe(11);
		expect(content.nodeName).toBe('#document-fragment');
		expect(content.childNodes.length).toBe(2);
		expect(content.parentNode).toBeNull();
	});

	test('is null on an element that is not a template', () => {
		const div = must(createTestDocument('<div></div>').querySelector('div'));
		expect(div.content).toBeNull();
		expect(div.isHTMLTemplateElement).toBe(false);
	});

	test('is the same object every time', () => {
		const template = must(createTestDocument('<template><p></p></template>').querySelector('template'));
		expect(must(template.content)).toBe(template.content);
	});

	test('is not a template when it is in the SVG namespace', () => {
		const doc = createTestDocument('<svg><template shadowrootmode="open"></template></svg>');
		const template = must(doc.querySelector('template'));
		expect(template.isHTMLTemplateElement).toBe(false);
		expect(template.declarativeShadowRootAttachment).toBe('not-attached');
	});
});

describe('getRootNode', () => {
	test('is the document for an element in the document', () => {
		const doc = createTestDocument('<div><p></p></div>');
		expect(must(doc.querySelector('p')).getRootNode()).toBe(doc);
	});

	test('is the content for an element in a template, at any depth', () => {
		const doc = createTestDocument('<template><div><p></p></div></template>');
		const template = must(doc.querySelector('template'));
		const p = must(must(template.content).querySelector('p'));
		expect(p.getRootNode()).toBe(template.content);
		expect(p.getRootNode({ composed: true })).toBe(template.content);
	});

	test('of the template itself is the tree it is in', () => {
		const doc = createTestDocument('<div><template><p></p></template></div>');
		expect(must(doc.querySelector('template')).getRootNode()).toBe(doc);
	});

	test('of a nested template is the content of the outer one', () => {
		const doc = createTestDocument('<template><template><p></p></template></template>');
		const outer = must(doc.querySelector('template'));
		const inner = must(must(outer.content).querySelector('template'));
		expect(inner.getRootNode()).toBe(outer.content);
		expect(must(must(inner.content).querySelector('p')).getRootNode()).toBe(inner.content);
	});

	test('of a fragment is itself', () => {
		const content = must(
			must(createTestDocument('<template><p></p></template>').querySelector('template')).content,
		);
		expect(content.getRootNode()).toBe(content);
	});
});

describe('treeParentElement', () => {
	const code = '<div><template><section><p id="p"></p></section><p id="top"></p></template></div>';

	test('is the parent element in the tree', () => {
		const doc = createTestDocument(code);
		const content = must(must(doc.querySelector('template')).content);
		expect(must(content.getElementById('p')).treeParentElement).toBe(content.querySelector('section'));
		expect(must(doc.querySelector('template')).treeParentElement).toBe(doc.querySelector('div'));
	});

	test('is null at the top of the content of a template, where parentElement is the template', () => {
		const doc = createTestDocument(code);
		const template = must(doc.querySelector('template'));
		const top = must(must(template.content).getElementById('top'));
		expect(top.treeParentElement).toBeNull();
		expect(top.parentElement).toBe(template);
	});

	test('is null for a template that is in no tree, where parentElement is its host', () => {
		const { template } = firstTemplate('<div><template shadowrootmode="open"></template></div>');
		expect(template.treeParentElement).toBeNull();
		expect(template.parentElement?.localName).toBe('div');
	});

	test('is the parent for a template that fails to attach a shadow root', () => {
		const { template } = firstTemplate('<ul><template shadowrootmode="open"></template></ul>');
		expect(must(template.treeParentElement).localName).toBe('ul');
	});
});

describe('a declarative shadow root', () => {
	test.each([
		['<div><template shadowrootmode="open"><p></p></template></div>', 'div'],
		['<div><template shadowrootmode="OPEN"><p></p></template></div>', 'div'],
		['<div><template shadowrootmode="closed"><p></p></template></div>', 'div'],
		['<x-foo><template shadowrootmode="open"><p></p></template></x-foo>', 'x-foo'],
		['<span><template shadowrootmode="open"><p></p></template></span>', 'span'],
		['<h3><template shadowrootmode="open"><p></p></template></h3>', 'h3'],
		['<body><template shadowrootmode="open"><p></p></template></body>', 'body'],
	])('is attached to a valid shadow host: %s', (code, hostName) => {
		const { template } = firstTemplate(code);
		expect(template.declarativeShadowRootAttachment).toBe('attached');
		const host = must(template.parentElement);
		expect(host.localName).toBe(hostName);
		expect(must(host.declarativeShadowRoot)).toBeInstanceOf(MLShadowRoot);
	});

	test.each([
		['<a><template shadowrootmode="open"></template></a>', 'a is not a valid shadow host'],
		['<ul><template shadowrootmode="open"></template></ul>', 'ul is not a valid shadow host'],
		['<div><template shadowrootmode="none"></template></div>', 'none is not a keyword'],
		['<div><template shadowrootmode=""></template></div>', 'an empty value is the missing value default'],
		['<div><template></template></div>', 'no attribute'],
		[
			'<div><template shadowrootmode="open"></template><template shadowrootmode="open"></template></div>',
			'the second template of a host',
		],
	])('is not attached: %s (%s)', code => {
		const doc = createTestDocument(code);
		const last = must([...doc.querySelectorAll('template')].at(-1));
		expect(last.declarativeShadowRootAttachment).toBe('not-attached');
		expect(last.isHTMLTemplateElement).toBe(true);
		expect(last.isInNoTree).toBe(false);
	});

	test('the first template of a host is attached and the second one is an ordinary template', () => {
		const doc = createTestDocument(
			'<div><template shadowrootmode="open" id="a"></template><template shadowrootmode="open" id="b"></template></div>',
		);
		expect(doc.getElementById('a')).toBeNull();
		const second = must(doc.getElementById('b'));
		expect(second.localName).toBe('template');
		expect(second.declarativeShadowRootAttachment).toBe('not-attached');
	});

	test('is the content of its template and the root of what is in it', () => {
		const doc = createTestDocument('<div><template shadowrootmode="open"><p id="a"></p></template></div>');
		const template = must(doc.deepQuerySelectorAll('template')[0]);
		const host = must(doc.querySelector('div'));
		const shadowRoot = must(host.shadowRoot);
		expect(template.content).toBe(shadowRoot);
		expect(must(shadowRoot.querySelector('p')).getRootNode()).toBe(shadowRoot);
		expect(shadowRoot.getRootNode()).toBe(shadowRoot);
		expect(shadowRoot.getRootNode({ composed: true })).toBe(doc);
		expect(shadowRoot.host).toBe(host);
	});

	test('of a closed mode is not exposed as shadowRoot', () => {
		const doc = createTestDocument('<div><template shadowrootmode="closed"><p></p></template></div>');
		const host = must(doc.querySelector('div'));
		expect(host.shadowRoot).toBeNull();
		expect(must(host.declarativeShadowRoot).mode).toBe('closed');
	});

	test('has the mode and the flags that its template says', () => {
		const doc = createTestDocument(
			'<div><template shadowrootmode="open" shadowrootdelegatesfocus shadowrootclonable shadowrootserializable shadowrootslotassignment="manual"></template></div>',
		);
		const shadowRoot = must(must(doc.querySelector('div')).shadowRoot);
		expect(shadowRoot.mode).toBe('open');
		expect(shadowRoot.delegatesFocus).toBe(true);
		expect(shadowRoot.clonable).toBe(true);
		expect(shadowRoot.serializable).toBe(true);
		expect(shadowRoot.slotAssignment).toBe('manual');
	});

	test('has no flag that its template does not say', () => {
		const doc = createTestDocument('<div><template shadowrootmode="open"></template></div>');
		const shadowRoot = must(must(doc.querySelector('div')).shadowRoot);
		expect(shadowRoot.delegatesFocus).toBe(false);
		expect(shadowRoot.clonable).toBe(false);
		expect(shadowRoot.serializable).toBe(false);
		expect(shadowRoot.slotAssignment).toBe('named');
	});

	test('its template is in no tree: the document does not find it, and it is its own root', () => {
		const doc = createTestDocument('<div><template shadowrootmode="open" id="t"></template></div>');
		const template = must(doc.deepQuerySelectorAll('template')[0]);
		expect(template.isInNoTree).toBe(true);
		expect(doc.querySelector('template')).toBeNull();
		expect(doc.getElementById('t')).toBeNull();
		expect(template.getRootNode()).toBe(template);
	});

	test('a template that fails to attach is an ordinary template of the outer tree', () => {
		const doc = createTestDocument('<ul><template shadowrootmode="open" id="t"></template></ul>');
		const template = must(doc.getElementById('t'));
		expect(template.localName).toBe('template');
		expect(template.isInNoTree).toBe(false);
		expect(template.getRootNode()).toBe(doc);
	});

	test('is attached inside the content of an ordinary template as well', () => {
		const doc = createTestDocument(
			'<template><div><template shadowrootmode="open"><p></p></template></div></template>',
		);
		const inner = must(must(must(doc.querySelector('template')).content).querySelector('div'));
		expect(must(inner.declarativeShadowRoot)).toBeInstanceOf(MLShadowRoot);
	});

	test('the host of a template at the top of the file is outside the file, so whether it is attached is unknown', () => {
		const { template } = firstTemplate('<template shadowrootmode="open"><p></p></template>');
		const content = must(template.content);
		expect(template.declarativeShadowRootAttachment).toBe('unknown');
		expect(template.isInNoTree).toBe(true);
		expect(content).not.toBeInstanceOf(MLShadowRoot);
		expect(must(content.querySelector('p')).getRootNode()).toBe(content);
	});

	test('a value that is not known until it is rendered leaves it unknown', async () => {
		const { parser } = await import('@markuplint/mustache-parser');
		const doc = createTestDocument('<div><template shadowrootmode="{{mode}}"><p></p></template></div>', { parser });
		const template = must(doc.deepQuerySelectorAll('template')[0]);
		expect(template.declarativeShadowRootAttachment).toBe('unknown');
		expect(template.declarativeShadowRootMode).toBeNull();
	});

	test('an earlier template of the host that is not known to ask for one leaves it unknown', async () => {
		const { parser } = await import('@markuplint/mustache-parser');
		const doc = createTestDocument(
			'<div><template shadowrootmode="{{mode}}"></template><template shadowrootmode="open" id="b"></template></div>',
			{ parser },
		);
		const second = must(doc.deepQuerySelectorAll('template')[1]);
		expect(second.declarativeShadowRootAttachment).toBe('unknown');
	});

	test('a host that is a component is not known to take one', async () => {
		const { parser } = await import('@markuplint/svelte-parser');
		const doc = createTestDocument('<Foo><template shadowrootmode="open"><p></p></template></Foo>', { parser });
		expect(must(doc.deepQuerySelectorAll('template')[0]).declarativeShadowRootAttachment).toBe('unknown');
	});

	test('the host is looked for through what the template engine renders away', async () => {
		const { parser } = await import('@markuplint/ejs-parser');
		const doc = createTestDocument(
			'<div><% if (x) { %><template shadowrootmode="open"><p></p></template><% } %></div>',
			{ parser },
		);
		const template = must(doc.deepQuerySelectorAll('template')[0]);
		expect(template.declarativeShadowRootAttachment).toBe('attached');
		expect(must(must(doc.querySelector('div')).declarativeShadowRoot)).toBeInstanceOf(MLShadowRoot);
	});
});

describe('a template of a framework whose children are put in the element', () => {
	const specs = async (name: 'react' | 'vue') => {
		const ext = (await import(name === 'react' ? '@markuplint/react-spec' : '@markuplint/vue-spec')).default;
		return schemaToSpec([htmlSpec as unknown as MLMLSpec, ext]);
	};

	test('React: is an ordinary element, and what is in it is in the document', async () => {
		const { parser } = await import('@markuplint/jsx-parser');
		const doc = createTestDocument('<div><template><p id="a" /></template></div>', {
			parser,
			specs: await specs('react'),
		});
		const template = must(doc.querySelector('template'));
		expect(template.isHTMLTemplateElement).toBe(false);
		expect(template.content).toBeNull();
		expect(must(doc.getElementById('a')).getRootNode()).toBe(doc);
	});

	test('Vue: is an ordinary element, and what is in it is in the document', async () => {
		const { parser } = await import('@markuplint/vue-parser');
		const doc = createTestDocument('<template><div><template><p id="a"></p></template></div></template>', {
			parser,
			specs: await specs('vue'),
		});
		expect(must(doc.querySelector('template')).isHTMLTemplateElement).toBe(false);
		expect(must(doc.getElementById('a')).getRootNode()).toBe(doc);
	});

	test('Vue: a template with a directive is not a template element either', async () => {
		const { parser } = await import('@markuplint/vue-parser');
		const doc = createTestDocument('<template><div><template v-if="x"><p id="a"></p></template></div></template>', {
			parser,
			specs: await specs('vue'),
		});
		expect(must(doc.querySelector('template')).isHTMLTemplateElement).toBe(false);
	});

	test('Svelte keeps the content of a template as a separate tree', async () => {
		const { parser } = await import('@markuplint/svelte-parser');
		const ext = (await import('@markuplint/svelte-spec')).default;
		const doc = createTestDocument('<div><template><p id="a"></p></template></div>', {
			parser,
			specs: schemaToSpec([htmlSpec as unknown as MLMLSpec, ext]),
		});
		expect(must(doc.querySelector('template')).isHTMLTemplateElement).toBe(true);
		expect(doc.getElementById('a')).toBeNull();
	});
});

describe('selectors and ancestors stop at the boundary of a tree', () => {
	const code = '<section><template><div><p id="p"></p></div><p id="top"></p></template></section>';
	const contentOf = (doc: ReturnType<typeof createTestDocument>) => must(must(doc.querySelector('template')).content);

	test('a descendant combinator does not reach an ancestor of another tree', () => {
		const content = contentOf(createTestDocument(code));
		expect(must(content.getElementById('p')).matches('section p')).toBe(false);
		expect(must(content.getElementById('p')).matches('div p')).toBe(true);
		expect(must(content.getElementById('top')).matches('section p')).toBe(false);
	});

	test('a child combinator does not reach the template element', () => {
		const content = contentOf(createTestDocument(code));
		expect(must(content.getElementById('top')).matches('template > p')).toBe(false);
		expect(must(content.getElementById('p')).matches('div > p')).toBe(true);
	});

	test(':closest and closest() do not reach an ancestor of another tree', () => {
		const p = must(contentOf(createTestDocument(code)).getElementById('p'));
		expect(p.closest('section')).toBeNull();
		expect(must(p.closest('div')).localName).toBe('div');
		expect(p.matches(':closest(section)')).toBe(false);
		expect(p.matches(':closest(div)')).toBe(true);
	});

	test(':has does not look into the content of a template', () => {
		const doc = createTestDocument(code);
		expect(doc.querySelectorAll('section:has(p)').length).toBe(0);
		expect(doc.deepQuerySelectorAll('div:has(p)').length).toBe(1);
	});

	test(':scope > matches a child of the element that is the scope, in the content as well', () => {
		const div = must(contentOf(createTestDocument(code)).querySelector('div'));
		expect([...div.querySelectorAll(':scope > p')].map(el => el.id)).toStrictEqual(['p']);
	});

	test('a sibling combinator works in the content', () => {
		const content = contentOf(createTestDocument(code));
		expect(must(content.getElementById('top')).matches('div + p')).toBe(true);
	});

	test('contains() does not enter the content of a template', () => {
		const doc = createTestDocument(code);
		const section = must(doc.querySelector('section'));
		const template = must(doc.querySelector('template'));
		const content = must(template.content);
		const p = must(content.getElementById('p'));
		expect(section.contains(p)).toBe(false);
		expect(template.contains(p)).toBe(false);
		expect(content.contains(p)).toBe(true);
		expect(section.contains(template)).toBe(true);
	});

	test('findSubsequentNodes() finds the nodes of the same tree only', () => {
		const doc = createTestDocument('<button></button><template><p id="in"></p></template><p id="out"></p>');
		const found = must(doc.querySelector('button')).findSubsequentNodes('p');
		expect(found.map(node => node.nodeName)).toStrictEqual(['P']);
		expect(found.map(node => node.startOffset)).toStrictEqual([doc.raw.indexOf('<p id="out">')]);
	});
});

describe('a name that an id reference gives is looked for in the tree of the element', () => {
	const roleOf = (code: string) => {
		const doc = createTestDocument(code);
		const el = must(doc.deepQuerySelectorAll('div')[0]);
		return getComputedRole(doc.specs, el, ARIA_RECOMMENDED_VERSION).role?.name;
	};
	const nameOf = (code: string, selector: string) => {
		const doc = createTestDocument(code);
		return must(doc.deepQuerySelectorAll(selector)[0]).getAccessibleName(ARIA_RECOMMENDED_VERSION);
	};

	test('a region named by a heading of the same template is a region', () => {
		expect(roleOf('<template><div role="region" aria-labelledby="h"></div><h2 id="h">x</h2></template>')).toBe(
			'region',
		);
	});

	test('a region named by a heading of another tree has no name, so it is generic', () => {
		expect(roleOf('<h2 id="h">x</h2><template><div role="region" aria-labelledby="h"></div></template>')).toBe(
			'generic',
		);
	});

	test('a region is a region when any one of the ids resolves', () => {
		expect(roleOf('<div role="region" aria-labelledby="a h"></div><h2 id="h">x</h2>')).toBe('region');
	});

	test('a region is a region when the id is written with a character reference', () => {
		expect(roleOf('<div role="region" aria-labelledby="&#104;"></div><h2 id="h">x</h2>')).toBe('region');
		expect(roleOf('<div role="region" aria-labelledby="h"></div><h2 id="&#104;">x</h2>')).toBe('region');
	});

	test('an accessible name is computed from an element of the same tree only', () => {
		expect(
			nameOf('<span id="l">Document</span><template><button aria-labelledby="l"></button></template>', 'button'),
		).toBe('');
		expect(
			nameOf('<template><span id="l">Content</span><button aria-labelledby="l"></button></template>', 'button'),
		).toBe('Content');
	});

	test('a label of the same tree names the control, and one of another tree does not', () => {
		expect(nameOf('<template><label for="x">Label</label><input id="x"></template>', 'input')).toBe('Label');
		expect(nameOf('<label for="x">Label</label><template><input id="x"></template>', 'input')).toBe('');
	});

	test('the character references of a reference are resolved, as those of the id are', () => {
		expect(nameOf('<span id="a">Name</span><input aria-labelledby="&#97;">', 'input')).toBe('Name');
		expect(nameOf('<label for="&#97;">Label</label><input id="a">', 'input')).toBe('Label');
		expect(nameOf('<label for="a">Label</label><input id="&#97;">', 'input')).toBe('Label');
	});
});

describe('an element that is in no tree', () => {
	test.each([
		[
			'a template that a declarative shadow root is attached to',
			'<div><template shadowrootmode="open"></template></div>',
		],
		['a template whose shadow root is not known to be attached', '<template shadowrootmode="open"></template>'],
	])('has an accessible name computed from nothing: %s', (_, code) => {
		const { template } = firstTemplate(code);
		expect(template.getAccessibleName(ARIA_RECOMMENDED_VERSION)).toBe('');
	});

	test('does not resolve an id reference', () => {
		const { template } = firstTemplate(
			'<span id="l">Label</span><div><template shadowrootmode="open" aria-labelledby="l"></template></div>',
		);
		expect(template.getAccessibleName(ARIA_RECOMMENDED_VERSION)).toBe('');
	});
});

describe('deepQuerySelectorAll', () => {
	test('finds an element in every tree, including a template that is in no tree', () => {
		const doc = createTestDocument(
			'<p id="a"></p><template><p id="b"></p></template><div><template shadowrootmode="open"><p id="c"></p></template></div>',
		);
		expect(
			doc
				.deepQuerySelectorAll('p')
				.map(el => el.id)
				.toSorted(),
		).toStrictEqual(['a', 'b', 'c']);
		expect(doc.deepQuerySelectorAll('template').length).toBe(2);
	});

	test('returns the same result for the same selector, and a result of its own for another', () => {
		const doc = createTestDocument('<p></p><template><p></p></template><b></b>');
		expect(doc.deepQuerySelectorAll('p')).toBe(doc.deepQuerySelectorAll('p'));
		expect(doc.deepQuerySelectorAll('b').length).toBe(1);
		expect(doc.deepQuerySelectorAll('p').length).toBe(2);
	});

	test('on an element, does not leave the element', () => {
		const doc = createTestDocument('<div><template><p id="a"></p></template></div><p id="b"></p>');
		const found = must(doc.querySelector('div')).deepQuerySelectorAll('p');
		expect(found.map(el => el.id)).toStrictEqual(['a']);
	});
});
