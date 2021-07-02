import { useCallback, useEffect, useRef, useState } from 'react';

type UseResizeContainerCallback = (width: number, height: number) => void;

export function useResizeContainer<T extends HTMLElement = HTMLElement>(
	callback: UseResizeContainerCallback,
	deps?: React.DependencyList | undefined,
) {
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const memoCallback = useCallback(callback, deps || []);
	const [width, setWidth] = useState(0);
	const [height, setHeight] = useState(0);
	const $ref = useRef<T>(null);
	const [rafId, setRaf] = useState(0);
	const [frame, nextFrame] = useState(0);
	useEffect(
		() => {
			cancelAnimationFrame(rafId);
			setRaf(
				requestAnimationFrame(() => {
					if (!$ref.current) {
						return;
					}
					const rect = $ref.current.getBoundingClientRect();
					setWidth(rect.width);
					setHeight(rect.height);
					nextFrame(frame + 1);
				}),
			);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[frame],
	);

	useEffect(() => {
		memoCallback(width, height);
	}, [width, height, memoCallback]);

	return [$ref] as const;
}
