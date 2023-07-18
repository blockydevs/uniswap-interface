import { Percent } from '@uniswap/sdk-core'
import JSBI from 'jsbi'

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

// TODO(WEB-3290): Convert the deadline to minutes and remove unecessary conversions from
// seconds to minutes in the codebase.
// 30 minutes, denominated in seconds
export const DEFAULT_DEADLINE_FROM_NOW = 60 * 30
export const L2_DEADLINE_FROM_NOW = 60 * 5

// transaction popup dismisal amounts
export const DEFAULT_TXN_DISMISS_MS = 10000
export const L2_TXN_DISMISS_MS = 5000

export const BIG_INT_ZERO = JSBI.BigInt(0)

// one basis JSBI.BigInt
const BIPS_BASE = JSBI.BigInt(10000)

// used for warning states
export const ALLOWED_PRICE_IMPACT_LOW: Percent = new Percent(JSBI.BigInt(100), BIPS_BASE) // 1%
export const ALLOWED_PRICE_IMPACT_MEDIUM: Percent = new Percent(JSBI.BigInt(300), BIPS_BASE) // 3%
export const ALLOWED_PRICE_IMPACT_HIGH: Percent = new Percent(JSBI.BigInt(500), BIPS_BASE) // 5%

export const BLOCKED_PRICE_IMPACT_NON_EXPERT: Percent = new Percent(JSBI.BigInt(1500), BIPS_BASE) // 15%

export const ZERO_PERCENT = new Percent('0')
export const ONE_HUNDRED_PERCENT = new Percent('1')
