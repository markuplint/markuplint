export class ConfigLoadError extends Error {
	filePath: string;
	name = 'ConfigLoadError';
	referrer: string;
	constructor(message: string, filePath: string, referrer: string) {
		super(message + ` in ${referrer}`);
		this.filePath = filePath;
		this.referrer = referrer;
	}
}
