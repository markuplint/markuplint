import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Diagnotic } from '../types';

interface LogState {
	diagnotics: Diagnotic[];
}

const initialState: LogState = {
	diagnotics: [],
};

export const logSlice = createSlice({
	name: 'log',
	initialState,
	reducers: {
		setDiagnotics: (state, action: PayloadAction<Diagnotic[]>) => {
			state.diagnotics = action.payload;
		},
	},
});

export const { setDiagnotics } = logSlice.actions;

export default logSlice.reducer;
