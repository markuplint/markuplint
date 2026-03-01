// Component that accepts children via destructured {children}
const WithChildren = ({ children }) => {
	return <div className="wrapper">{children}</div>;
};

// Component that accepts children via props.children
const WithPropsChildren = props => {
	return <section>{props.children}</section>;
};

// Self-closing (void) component — no children slot
const VoidComponent = props => {
	return <img src={props.src} />;
};

// Component with static content only — no children slot
const StaticContent = () => {
	return <p>Hello World</p>;
};

// Component with nested {children} (not at root level)
const NestedChildren = ({ children }) => {
	return (
		<div>
			<header>Title</header>
			<main>{children}</main>
		</div>
	);
};
