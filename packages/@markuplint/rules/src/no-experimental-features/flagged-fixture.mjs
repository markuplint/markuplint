// An extended spec whose SVG `circle` and MathML `mi` are experimental, and whose `mi` takes an
// experimental `flag` attribute. The bundled spec data has no experimental SVG or MathML element and
// no experimental MathML attribute, so the rule has no other way to report on them.
export default {
	specs: [
		{ name: 'svg:circle', experimental: true },
		{ name: 'mml:mi', experimental: true, attributes: { flag: { type: 'Any', experimental: true } } },
	],
};
