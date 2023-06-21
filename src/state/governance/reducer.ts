import { createSlice } from '@reduxjs/toolkit'

interface GovernanceState {
  hmtBalance: any
}

const initialState: GovernanceState = {
  hmtBalance: [],
}

const hmtBalanceSlice = createSlice({
  name: 'HMT',
  initialState,
  reducers: {
    hmtBalanceUpdate(state, action) {
      state.hmtBalance = action.payload
    },
  },
})

export const { hmtBalanceUpdate } = hmtBalanceSlice.actions
export default hmtBalanceSlice.reducer
