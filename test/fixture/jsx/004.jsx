const Component = () => {
	return (
		<>
			<div as="span">
				<authoredcomponent as="div"></authoredcomponent>
			</div>
			<div>
				<authoredcomponent2 as="div"></authoredcomponent2>
			</div>
			<div>
				<authored-component as="div"></authored-component>
			</div>
			<span>
				<AuthoredComponent as="div"></AuthoredComponent>
			</span>
		</>
	);
};

module.exports = Component;
