// An attribute written as `{prop}` forwards a prop of the component

export function Destructured({ label, children }) {
	return <button aria-label={label}>{children}</button>;
}

export function Aliased({ label: text, children }) {
	return <button aria-label={text}>{children}</button>;
}

export function PropsObject(props) {
	return <button aria-label={props.label}>{props.children}</button>;
}

export function Parenthesized({ label, children }) {
	return <button aria-label={(label as string)!}>{children}</button>;
}

export function WithDefault({ type = 'button', children }) {
	return <button type={type}>{children}</button>;
}

export function WithRest({ label, children, ...rest }) {
	return (
		<button aria-label={label} {...rest}>
			{children}
		</button>
	);
}

export function Shadowed({ label, children }) {
	const render = label => label;
	return <button aria-label={label}>{render(children)}</button>;
}

export function Expression({ label, children }) {
	return <button aria-label={label ?? 'Save'}>{children}</button>;
}

export function Other({ children }) {
	return <button aria-label={outside}>{children}</button>;
}

export const ForwardRef = forwardRef(({ label, children }, ref) => (
	<button ref={ref} aria-label={label}>
		{children}
	</button>
));

export function ThisParam(this: void, { label, children }) {
	return <button aria-label={label}>{children}</button>;
}

export function SlotWrapper({ label, children }) {
	return (
		<div>
			<span title={label}>{children}</span>
		</div>
	);
}

export function RootContents({ label, children }) {
	return (
		<div>
			<i aria-label={label} />
			{children}
		</div>
	);
}

export function SameInBothBranches({ label, children, flag }) {
	return flag ? (
		<button aria-label={label}>{children}</button>
	) : (
		<button aria-label={label} type="button">
			{children}
		</button>
	);
}

export function DifferentInBranches({ label, other, children, flag }) {
	return flag ? <button aria-label={label}>{children}</button> : <button aria-label={other}>{children}</button>;
}

export function ChildrenAsAttribute({ children }) {
	return <button data-content={children}>x</button>;
}

export function ShadowedProps(props) {
	const unused = props => props;
	return <button aria-label={props.label}>{props.children}</button>;
}

export function ElementAccess(props) {
	return <button aria-label={props['label']}>{props.children}</button>;
}

export function ChildrenAlias({ children: kids }) {
	return <button data-content={kids}>{kids}</button>;
}

export function RestMember({ label, ...rest }) {
	return <button aria-label={rest.label}>{rest.children}</button>;
}
