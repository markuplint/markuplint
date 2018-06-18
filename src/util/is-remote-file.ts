import URL from 'url';

export default function(address: string) {
	return !!URL.parse(address).protocol;
}
