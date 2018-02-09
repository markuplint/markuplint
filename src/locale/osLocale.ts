import osLocale from 'os-locale';

let cachedLocale: string | null = null;

export default async function () {
	if (!cachedLocale) {
		cachedLocale = await osLocale({ spawn: true });
	}
	return cachedLocale;
}
