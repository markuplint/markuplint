import { memo, PropsWithChildren } from 'react';
import { FrameSplitter } from './FrameSplitter';

export const Frame = memo<
	PropsWithChildren<{
		name: string;
		z?: number;
		splitter?: 'n' | 'e' | 'w' | 's';
		value?: number;
		onChange?: (v: number) => void;
		scrollable?: boolean;
		fit?: boolean;
	}>
>(({ name, z, splitter, value, onChange, scrollable, fit, children }) => {
	const containerCSS = scrollable
		? 'absolute top-0 left-0 w-full h-full overflow-y-auto'
		: fit
		? 'absolute top-0 left-0 w-full h-full overflow-hidden'
		: 'relative';
	return (
		<div className="relative" style={{ gridArea: name }}>
			<div className="relative w-full h-full">
				<div className={containerCSS} style={{ zIndex: z }}>
					{children}
				</div>
			</div>
			{splitter && value != null && onChange && (
				<FrameSplitter name={name} postion={splitter} value={value} onChange={onChange} />
			)}
		</div>
	);
});
