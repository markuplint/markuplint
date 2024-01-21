/// <reference types="vitest" />

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'jsdom',
		include: ['src/**/*.spec.{js,ts,jsx,tsx}'],
		setupFiles: ['./vitest.setup.tsx'],
	},
});
