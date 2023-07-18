import { Currency, Token } from '@uniswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import { SupportedChainId } from 'constants/chains'
import { useCurrencyFromMap, useTokenFromMapOrNetwork } from 'lib/hooks/useCurrency'
import { TokenAddressMap } from 'lib/hooks/useTokenList/utils'
import { useMemo } from 'react'

import { useCombinedActiveList } from '../state/lists/hooks'
import { useUserAddedTokens } from '../state/user/hooks'

type Maybe<T> = T | null | undefined

// reduce token map into standard address <-> Token mapping, optionally include user added tokens
function useTokensFromMap(tokenMap: TokenAddressMap, chainId: Maybe<SupportedChainId>): { [address: string]: Token } {
  return useMemo(() => {
    if (!chainId) return {}

    // reduce to just tokens
    return Object.keys(tokenMap[chainId] ?? {}).reduce<{ [address: string]: Token }>((newMap, address) => {
      newMap[address] = tokenMap[chainId][address].token
      return newMap
    }, {})
  }, [chainId, tokenMap])
}

/** Returns all tokens from the default list + user added tokens */
export function useDefaultActiveTokens(chainId: Maybe<SupportedChainId>): { [address: string]: Token } {
  const defaultListTokens = useCombinedActiveList()
  const tokensFromMap = useTokensFromMap(defaultListTokens, chainId)
  const userAddedTokens = useUserAddedTokens()
  return useMemo(() => {
    return (
      userAddedTokens
        // reduce into all ALL_TOKENS filtered by the current chain
        .reduce<{ [address: string]: Token }>(
          (tokenMap, token) => {
            tokenMap[token.address] = token
            return tokenMap
          },
          // must make a copy because reduce modifies the map, and we do not
          // want to make a copy in every iteration
          { ...tokensFromMap }
        )
    )
  }, [tokensFromMap, userAddedTokens])
}

// undefined if invalid or does not exist
// null if loading or null was passed
// otherwise returns the token
export function useToken(tokenAddress?: string | null): Token | null | undefined {
  const { chainId } = useWeb3React()
  const tokens = useDefaultActiveTokens(chainId)
  return useTokenFromMapOrNetwork(tokens, tokenAddress)
}

export function useCurrency(currencyId: Maybe<string>, chainId?: SupportedChainId): Currency | null | undefined {
  const { chainId: connectedChainId } = useWeb3React()
  const tokens = useDefaultActiveTokens(chainId ?? connectedChainId)
  return useCurrencyFromMap(tokens, chainId ?? connectedChainId, currencyId)
}
