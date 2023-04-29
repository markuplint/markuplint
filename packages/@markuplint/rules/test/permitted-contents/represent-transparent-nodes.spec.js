const specs = require('@markuplint/html-spec');
const { createTestElement } = require('@markuplint/ml-core');

const {
	representTransparentNodes,
	transparentMode,
} = require('../../lib/permitted-contents/represent-transparent-nodes');

function c(html) {
	const el = createTestElement(`<div>${html}</div>`);
	const { nodes } = representTransparentNodes(Array.from(el.children), specs, { ignoreHasMutableChildren: true });
	return nodes.map(n => n.nodeName.toLowerCase() + (transparentMode.has(n) ? '*' : ''));
}

it('<div>', () => {
	expect(c('<div></div>')).toStrictEqual(['div']);
});

it('<audio>', () => {
	expect(c('<audio></audio>')).toStrictEqual([]);
	expect(c('<audio><span></span></audio>')).toStrictEqual(['span*']);
	expect(c('<audio><source></source><span></span></audio>')).toStrictEqual(['span*']);
	expect(c('<audio><source></source><track></track><span></span></audio>')).toStrictEqual(['span*']);
});
