export const debounce = <F extends (...args: A) => void, A extends any[] = never[]>(fn: F, interval: number) => {
	let timer: ReturnType<typeof setTimeout> | undefined;
	return (...args: A) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), interval);
	};
};
