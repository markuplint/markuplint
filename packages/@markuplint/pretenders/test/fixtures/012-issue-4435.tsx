// An attribute written as code is reported as the code, whether or not it is a literal.

export const Literals = () => (
	<div
		aria-busy={true}
		aria-hidden={false}
		aria-label={'Name'}
		tabIndex={0}
		title={'x'}
		data-n={-1}
		data-t={`t`}
		data-null={null}
		data-undefined={undefined}
		data-text={'true'}
	/>
);

export const Shorthand = () => <button disabled aria-pressed />;

export const Conditional = ({ selected }: { selected: boolean }) => <button tabIndex={selected ? 0 : -1} />;

export const Forwarded = ({ label, busy }: { label: string; busy: boolean }) => (
	<button aria-label={label} aria-busy={busy} />
);

export const Wrapped = () => <div hidden={false as boolean} title={'y' as string} />;

export const Calls = () => <div title={String(1)} data-a={`a${1}`} />;
