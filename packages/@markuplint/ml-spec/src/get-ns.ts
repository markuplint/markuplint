export function getNS(namespaceURI: string) {
	switch (namespaceURI) {
		case 'http://www.w3.org/2000/svg': {
			return 'svg';
		}
		case 'http://www.w3.org/1998/Math/MathML': {
			return 'mml';
		}
		default: {
			return 'html';
		}
	}
}
