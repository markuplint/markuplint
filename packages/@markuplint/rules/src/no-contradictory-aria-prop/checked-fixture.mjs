// An extended spec whose `svg` takes a Boolean `checked` attribute, the native equivalent of
// `aria-checked`. No SVG element of the bundled spec data has an attribute that an ARIA property
// is the equivalent of, so the rule has no other way to report on one.
export default {
	specs: [{ name: 'svg:svg', attributes: { checked: { type: 'Boolean' } } }],
};
