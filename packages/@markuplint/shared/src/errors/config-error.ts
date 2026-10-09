/**
 * Thrown, or collected into a config set's `errs`, when a configuration
 * cannot be loaded (Tier 2 — Per-File Recoverable): a config file that is
 * missing, empty or malformed, or a preset that cannot be imported.
 * `MLEngine` does not lint the affected file; it reports one error-severity
 * `config-error` violation for it, while other files continue to be processed.
 */
export class ConfigLoadError extends Error {
	filePath: string;
	name = 'ConfigLoadError';
	referrer: string;

	/**
	 * @param message - Description of the load failure
	 * @param filePath - Absolute path to the config file that failed to load
	 * @param referrer - Path of the file that referenced this config
	 */
	constructor(message: string, filePath: string, referrer: string) {
		super(message + ` in ${referrer}`);
		this.filePath = filePath;
		this.referrer = referrer;
	}
}
