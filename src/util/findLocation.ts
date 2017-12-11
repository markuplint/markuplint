export interface Location {
	line: number;
	col: number;
	raw: string;
}

export default function (searches: string[], text: string, currentLine: number, currentCol: number) {
	const lines = text.split(/\r?\n/g);
	const foundLocations: Location[] = [];
	lines.forEach((line, i) => {
		for (const search of searches) {
			const offset = line.indexOf(search);
			if (offset > 0) {
				console.log({ line, search, offset });
				foundLocations.push({
					line: i + currentLine,
					col: i === 0 ? offset + currentCol : offset + 1,
					raw: search,
				});
			}
		}
	});
	return foundLocations;
}
