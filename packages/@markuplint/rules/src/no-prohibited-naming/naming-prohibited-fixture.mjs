// An extended spec whose `svg` has no role and prohibits naming, as `cite` does in HTML. No SVG
// element of the bundled spec data prohibits naming, so the rule has no other way to report on one.
export default {
	specs: [{ name: 'svg:svg', aria: { implicitRole: false, permittedRoles: true, namingProhibited: true } }],
};
