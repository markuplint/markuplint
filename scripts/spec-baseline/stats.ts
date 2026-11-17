/**
 * The statistics of the timings.
 *
 * A timing is not one number that a number of repeats averages out: a run varies between process
 * starts (memory layout, the state of the JIT), and within a process between iterations, and an
 * interval that ignores the first level is too narrow (Kalibera & Jones, "Rigorous Benchmarking
 * in Reasonable Time", ISMM 2013). The data is therefore a list of processes, each with its
 * iterations, and an interval resamples both levels: the processes with replacement, then the
 * iterations of each chosen process with replacement (a two-level bootstrap), and takes the mean of
 * the process means. Kalibera & Jones derive an analytic interval from the variance components;
 * the bootstrap avoids their normality assumption and is what their later work applies to the
 * ratio of two means ("Quantifying Performance Changes with Effect Size Confidence Intervals").
 *
 * The iterations are not trimmed of a warmup: a JIT'ed program often never reaches a steady state
 * (Barrett et al., "Virtual Machine Warmup Blows Hot and Cold", OOPSLA 2017), so which
 * iterations are the warmup is not known in advance and the callers keep the first iteration
 * apart from the rest instead of discarding any.
 *
 * Every random choice is made from a seeded generator, so that the same data gives the same
 * interval.
 *
 * @module
 */

/** A timing: one entry for each process, holding the iterations of that process. */
export type Processes = readonly (readonly number[])[];

/** Options of the bootstrap. */
export interface BootstrapOptions {
	/** How many resamples. 10,000 is the usual figure for a 95% interval. */
	readonly resamples: number;
	readonly seed: number;
	/** The width of the interval, 0.95 by default. */
	readonly confidence?: number;
}

/**
 * The arithmetic mean.
 *
 * @param values - At least one number
 * @returns The mean
 */
export function mean(values: readonly number[]): number {
	if (values.length === 0) {
		throw new Error('The mean of an empty list is not defined');
	}
	let sum = 0;
	for (const value of values) {
		sum += value;
	}
	return sum / values.length;
}

/**
 * A percentile by linear interpolation between the nearest ranks.
 *
 * @param values - At least one number, in any order
 * @param fraction - 0 for the smallest, 1 for the largest
 * @returns The value at that fraction
 */
export function percentile(values: readonly number[], fraction: number): number {
	if (values.length === 0 || !(fraction >= 0 && fraction <= 1)) {
		throw new Error('A percentile needs a list with a number in it and a fraction from 0 to 1');
	}
	const sorted = values.toSorted((a, b) => a - b);
	const position = (sorted.length - 1) * fraction;
	const lower = Math.floor(position);
	const upper = Math.ceil(position);
	const low = sorted[lower] ?? 0;
	const high = sorted[upper] ?? 0;
	return low + (high - low) * (position - lower);
}

/**
 * A small deterministic generator (mulberry32; its increment is 0x6D2B79F5).
 *
 * @param seed - Any integer
 * @returns A function that returns the next number in [0, 1)
 */
export function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 1_831_565_813) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
	};
}

function assertOptions(options: BootstrapOptions): void {
	const confidence = options.confidence ?? 0.95;
	if (!Number.isInteger(options.resamples) || options.resamples < 1 || !(confidence > 0 && confidence < 1)) {
		throw new Error('A bootstrap needs a whole number of resamples of 1 or more and a confidence between 0 and 1');
	}
}

function assertTiming(data: Processes): void {
	if (data.length === 0 || data.some(process => process.length === 0)) {
		throw new Error('A timing needs at least one process, and each process at least one iteration');
	}
}

function meanOfProcessMeans(data: Processes): number {
	return mean(data.map(process => mean(process)));
}

function resample(data: Processes, random: () => number): Processes {
	return Array.from({ length: data.length }, () => {
		const process = data[Math.floor(random() * data.length)] ?? [];
		return Array.from({ length: process.length }, () => process[Math.floor(random() * process.length)] ?? 0);
	});
}

/** A mean with its interval. */
export interface MeanCI {
	readonly mean: number;
	readonly low: number;
	readonly high: number;
}

/**
 * The mean of a timing with a bootstrap interval.
 *
 * @param data - The processes, each with its iterations
 * @param options - The number of resamples, the seed and the confidence
 * @returns The mean of the process means and the interval around it
 */
export function bootstrapCI(data: Processes, options: BootstrapOptions): MeanCI {
	assertTiming(data);
	assertOptions(options);
	const random = mulberry32(options.seed);
	const confidence = options.confidence ?? 0.95;
	const means = Array.from({ length: options.resamples }, () => meanOfProcessMeans(resample(data, random)));
	const tail = (1 - confidence) / 2;
	return {
		mean: meanOfProcessMeans(data),
		low: percentile(means, tail),
		high: percentile(means, 1 - tail),
	};
}

/** A ratio of means with its interval. */
export interface RatioCI {
	readonly ratio: number;
	readonly low: number;
	readonly high: number;
}

/**
 * The ratio of the mean of one timing to the mean of another, with an interval, so that a result reads as
 * "A takes 1.8 times as long as B, 1.5 to 2.1 with 95% confidence": an interval that contains 1 is no
 * evidence of a difference.
 *
 * The two timings are resampled independently.
 *
 * @param numerator - The processes of the first timing
 * @param denominator - The processes of the second timing
 * @param options - The number of resamples, the seed and the confidence
 * @returns The ratio of the means and the interval around it
 */
export function ratioCI(numerator: Processes, denominator: Processes, options: BootstrapOptions): RatioCI {
	assertTiming(numerator);
	assertTiming(denominator);
	assertOptions(options);
	const random = mulberry32(options.seed);
	const confidence = options.confidence ?? 0.95;
	const ratios = Array.from(
		{ length: options.resamples },
		() => meanOfProcessMeans(resample(numerator, random)) / meanOfProcessMeans(resample(denominator, random)),
	);
	const tail = (1 - confidence) / 2;
	return {
		ratio: meanOfProcessMeans(numerator) / meanOfProcessMeans(denominator),
		low: percentile(ratios, tail),
		high: percentile(ratios, 1 - tail),
	};
}
