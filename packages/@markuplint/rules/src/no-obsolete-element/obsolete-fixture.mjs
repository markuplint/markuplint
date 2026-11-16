// An extended spec whose MathML `mi` and SVG `circle` are obsolete. No SVG or MathML element of the
// bundled spec data is obsolete, so the rule has no other way to report on one.
export default {
	specs: [
		{ name: 'mml:mi', obsolete: true },
		{ name: 'svg:circle', obsolete: true },
	],
};
