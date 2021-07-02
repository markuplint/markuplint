import { configureStore } from '@reduxjs/toolkit';
import logReducer from './log';

export const store = configureStore({
	reducer: {
		log: logReducer,
	},
	devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
