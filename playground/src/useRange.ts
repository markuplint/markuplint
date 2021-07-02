import { useState, useCallback } from 'react';

export function useRange(defaultValue: number, min: number, max: number) {
	const [value, setValue] = useState(defaultValue);

	const updater = useCallback(
		(newValue: number) => {
			setValue(Math.min(max, Math.max(min, newValue)));
		},
		[min, max],
	);

	return [value, updater] as const;
}
