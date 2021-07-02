import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useRange } from './useRange';

const INCREMENT_ON_ARROW_KEY = 5;

export const FrameSplitter = memo<{
	name: string;
	postion: 'n' | 'e' | 'w' | 's';
	value: number;
	onChange: (v: number) => void;
}>(({ name, postion, value: defaultValue, onChange }) => {
	const { orientation, direction, rect } = computePositionStyle(postion);

	const [value, setValue] = useRange(defaultValue, 0, 100);

	const $hr = useRef<HTMLHRElement>(null);

	useEffect(() => {
		onChange(value);
	}, [onChange, value]);

	const onKeyUp = useCallback(
		(e: React.KeyboardEvent<HTMLHRElement>) => {
			if (orientation === 'horizontal') {
				if (e.code === 'ArrowUp') {
					setValue(value + INCREMENT_ON_ARROW_KEY);
				}
				if (e.code === 'ArrowDown') {
					setValue(value - INCREMENT_ON_ARROW_KEY);
				}
				return;
			}
			if (e.code === 'ArrowRight') {
				setValue(value + INCREMENT_ON_ARROW_KEY);
			}
			if (e.code === 'ArrowLeft') {
				setValue(value - INCREMENT_ON_ARROW_KEY);
			}
		},
		[setValue, value, orientation],
	);

	const [clearFlag, clear] = useState(0);
	useEffect(
		() => {
			if (!$hr.current) {
				return;
			}
			const hr = $hr.current;
			let dragStartPos = NaN;
			let range = NaN;
			function dragStart(e: MouseEvent) {
				const rect = hr.getBoundingClientRect();
				// hr -> div -> ParentComponent
				const containerRect = hr.parentElement?.parentElement?.getBoundingClientRect();
				if (!(rect && containerRect)) {
					return;
				}
				const valueToPixel = orientation === 'horizontal' ? containerRect.height : containerRect.width;
				range = Math.round((valueToPixel * 100) / value);
				dragStartPos = orientation === 'horizontal' ? e.pageY : e.pageX;
			}
			function dragMove(e: MouseEvent) {
				if (isNaN(dragStartPos) || isNaN(range)) {
					return;
				}
				const pos = orientation === 'horizontal' ? e.pageY : e.pageX;
				const diff = pos - dragStartPos;
				const moveRatio = (diff / range) * 100 * (direction === 'negative' ? -1 : 1);
				setValue(value + moveRatio);
			}
			function dragEnd() {
				dragStartPos = NaN;
				range = NaN;
				clear(clearFlag + 1);
			}
			hr.addEventListener('mousedown', dragStart);
			document.addEventListener('mousemove', dragMove);
			document.addEventListener('mouseup', dragEnd);
			document.addEventListener('mouseleave', dragEnd);
			window.addEventListener('blur', dragEnd);
			return function cleanup() {
				hr.removeEventListener('mousedown', dragStart);
				document.removeEventListener('mousemove', dragMove);
				document.removeEventListener('mouseup', dragEnd);
				document.removeEventListener('mouseleave', dragEnd);
				window.removeEventListener('blur', dragEnd);
			};
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[clearFlag],
	);

	return (
		<div className={`absolute transform ${rect}`}>
			{/* @see https://github.com/A11yance/aria-query/pull/198 */}
			{/* eslint-disable-next-line jsx-a11y/role-supports-aria-props */}
			<hr
				ref={$hr}
				aria-label={`Partition of ${name} Pane`}
				aria-valuenow={value}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-orientation={orientation}
				tabIndex={0}
				className={`w-full h-full border-0 outline-none bg-gray-400 focus:bg-blue-500 cursor-${orientation}`}
				onKeyUp={onKeyUp}
			/>
		</div>
	);
});

function computePositionStyle(postion: 'n' | 'e' | 'w' | 's') {
	let orientation: 'vertical' | 'horizontal';
	let direction: 'positive' | 'negative';
	let rect: string;
	switch (postion) {
		case 'n': {
			orientation = 'horizontal';
			direction = 'negative';
			rect = 'top-0 left-0 w-full h-1 hover:h-3 hover:scale-y-300 focus-within:scale-y-300';
			break;
		}
		case 'e': {
			orientation = 'vertical';
			direction = 'positive';
			rect = 'top-0 right-0 w-1 h-full hover:scale-x-300 focus-within:scale-x-300';
			break;
		}
		case 'w': {
			orientation = 'horizontal';
			direction = 'positive';
			rect = 'bottom-0 left-0 w-full h-1 hover:h-3 hover:scale-y-300 focus-within:scale-y-300';
			break;
		}
		case 's': {
			orientation = 'vertical';
			direction = 'negative';
			rect = 'top-0 left-0 w-1 h-full hover:scale-x-300 focus-within:scale-x-300';
			break;
		}
	}
	return {
		orientation,
		direction,
		rect,
	};
}
