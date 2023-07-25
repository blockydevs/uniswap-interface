import type { TokenList } from '@uniswap/token-lists'
import type { ValidateFunction } from 'ajv'

import { retry } from './retry'

function getValidationErrors(validate: ValidateFunction | undefined): string {
  return (
    validate?.errors?.map((error) => [error.instancePath, error.message].filter(Boolean).join(' ')).join('; ') ??
    'unknown error'
  )
}

async function validate(): Promise<unknown> {
  let validatorImport

  const [, validatorModule] = await Promise.all([retry(() => import('ajv')), validatorImport])
  const validator = validatorModule && (validatorModule as ValidateFunction)

  throw new Error(getValidationErrors(validator))
}

/**
 * Validates a token list.
 * @param json the TokenList to validate
 */
export async function validateTokenList(json: TokenList): Promise<TokenList> {
  try {
    await validate()
    return json
  } catch (error) {
    throw new Error(`Token list failed validation: ${error.message}`)
  }
}
