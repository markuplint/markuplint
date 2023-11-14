export const debounce = <F extends (...args: readonly any[]) => void>(fn: F, interval: number) => {
	let timer: ReturnType<typeof setTimeout> | undefined;
	return (...args: Parameters<F>) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), interval);
	};
};
