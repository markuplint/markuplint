// Issue #4054: the four components reported to produce false positives.

export function Button({ type }: { type?: 'button' | 'submit' | 'reset' }) {
	return (
		<button aria-label="Save" type={type === 'submit' ? 'submit' : type === 'reset' ? 'reset' : 'button'}>
			Save
		</button>
	);
}

export function Tab({ selected }: { selected: boolean }) {
	return (
		<button type="button" role="tab" aria-label="Example" tabIndex={selected ? 0 : -1}>
			Example
		</button>
	);
}

export function Chip({ interactive, label }: { interactive: boolean; label: string }) {
	if (interactive) {
		return (
			<button type="button" aria-label="Notifications">
				{label}
			</button>
		);
	}

	return <span>{label}</span>;
}

export function Picture() {
	return (
		<picture>
			<img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="Example" />
		</picture>
	);
}

// Attribute classification

export const Literals = () => <div tabIndex={0} title={'x'} data-n={-1} data-t={`t`} />;

// Own return points only

export const Items = ({ items }: { items: string[] }) => (
	<ul>
		{items.map(item => (
			<li key={item}>{item}</li>
		))}
	</ul>
);

export function SameBranches({ primary }: { primary: boolean }) {
	if (primary) {
		return (
			<button type="button" aria-label="a">
				A
			</button>
		);
	}
	return <button type="button">B</button>;
}

export function NullBranch({ hidden }: { hidden: boolean }) {
	if (hidden) {
		return null;
	}
	return <section>content</section>;
}

export function ChildrenBranch({ asChild, children }: { asChild: boolean; children: unknown }) {
	if (asChild) {
		return children;
	}
	return <button>{children}</button>;
}

export function MixedSlotBranches({ loading, children }: { loading: boolean; children: unknown }) {
	if (loading) {
		return <button disabled>Loading</button>;
	}
	return <button>{children}</button>;
}

export function DivergingWrappers({ flat, children }: { flat: boolean; children: unknown }) {
	if (flat) {
		return <div>{children}</div>;
	}
	return (
		<div>
			<p>{children}</p>
		</div>
	);
}

export const Memo = memo(function Memo() {
	return <aside>x</aside>;
});

export const Fwd = forwardRef((props, ref) => <nav ref={ref}>y</nav>);

// Multiple roots

export const Fields = () => (
	<>
		<label>Name</label>
		<input />
	</>
);

export const FragmentWithSlot = ({ children }: { children: unknown }) => (
	<>
		<legend>Title</legend>
		{children}
	</>
);

export const FragmentNestedSlot = ({ children }: { children: unknown }) => (
	<>
		<h2>Title</h2>
		<div>{children}</div>
	</>
);

// Slot position and slot wrapper

export const Details = ({ children }: { children: unknown }) => <details>{children}</details>;

export const PictureSlot = ({ children }: { children: unknown }) => (
	<picture>
		{children}
		<img src="a.gif" alt="x" />
	</picture>
);

export const Card = ({ children }: { children: unknown }) => (
	<div>
		<h2>Title</h2>
		<p className="body">{children}</p>
	</div>
);

export const WrappedByComponent = ({ children }: { children: unknown }) => (
	<div>
		<Tooltip>{children}</Tooltip>
	</div>
);

export const WrappedByProvider = ({ children }: { children: unknown }) => (
	<div>
		<Ctx.Provider value={1}>{children}</Ctx.Provider>
	</div>
);

export const TwoWrappers = ({ children }: { children: unknown }) => (
	<div>
		<p>{children}</p>
		<ul>{children}</ul>
	</div>
);

export const DynamicChild = ({ summary, children }: { summary: unknown; children: unknown }) => (
	<details>
		{summary}
		{children}
	</details>
);

export const ComponentChild = ({ children }: { children: unknown }) => (
	<details>
		<Summary />
		{children}
	</details>
);

// Review follow-ups

export function IconButton({ pressed, label }: { pressed: boolean; label: string }) {
	if (pressed) {
		return <button aria-label="Unmute" type="button" />;
	}
	return <button aria-label={label} type="button" />;
}

export const Kan = () => (
	<ruby>
		漢<rt>kan</rt>
	</ruby>
);

export const Providers = ({ children }: { children: unknown }) => (
	<A.Provider value={1}>
		<B.Provider value={2}>
			<div>{children}</div>
		</B.Provider>
	</A.Provider>
);

export const Figure = ({ children }: { children: unknown }) => (
	<figure>
		{children}
		{children}
	</figure>
);
