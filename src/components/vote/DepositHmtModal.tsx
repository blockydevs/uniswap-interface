import { isAddress } from '@ethersproject/address'
import { Trans } from '@lingui/macro'
import { useWeb3React } from '@web3-react/core'
import ExchangeHmtInput from 'components/ExchangeHmtInput'
import { useHmtContractToken, useTokenBalance } from 'lib/hooks/useCurrencyBalance'
import { ReactNode, useState } from 'react'
import { X } from 'react-feather'
import styled from 'styled-components/macro'
import { formatCurrencyAmount } from 'utils/formatCurrencyAmount'

import useENS from '../../hooks/useENS'
import { useDelegateCallback } from '../../state/governance/hooks'
import { ThemedText } from '../../theme'
import { ButtonPrimary } from '../Button'
import { AutoColumn } from '../Column'
import Modal from '../Modal'
import { LoadingView, SubmittedView } from '../ModalViews'
import { RowBetween } from '../Row'

const ContentWrapper = styled(AutoColumn)`
  width: 100%;
  padding: 24px;
`

const StyledClosed = styled(X)`
  :hover {
    cursor: pointer;
  }
`

interface DepositHmtProps {
  isOpen: boolean
  onDismiss: () => void
  title: ReactNode
}

export default function DepositHmtModal({ isOpen, onDismiss, title }: DepositHmtProps) {
  const { account, chainId } = useWeb3React()
  // BLOCKYTODO: jakiego typu oczekuje funkcja depositFor?
  const [currencyToExchange, setCurrencyToExchange] = useState<string>('')
  console.log('currencyToExchange:', currencyToExchange)

  const { address: parsedAddress } = useENS(account)
  const delegateCallback = useDelegateCallback()
  const hmtContractToken = useHmtContractToken()

  // get the number of votes available to delegate
  // const uniBalance = useTokenBalance(account ?? undefined, chainId ? UNI[chainId] : undefined)
  const hmtBalance = useTokenBalance(account ?? undefined, chainId ? hmtContractToken : undefined)

  // monitor call to help UI loading state
  const [hash, setHash] = useState<string | undefined>()
  const [attempting, setAttempting] = useState(false)

  // wrapper to reset state on modal close
  function wrappedOnDismiss() {
    setAttempting(false)
    onDismiss()
  }

  function onInputHmtExchange(value: string) {
    setCurrencyToExchange(value)
  }

  // try delegation and store hash
  async function onDepositHmtSubmit() {
    setAttempting(true)
    // if (!delegateCallback) return

    // try delegation and store hash
    // BLOCKYTODO: czy hash jest mi tu niezbędny?
    // Jeśli tak, to jak uzyskać go w procesie depositFor?
    // const hash = await delegateCallback(parsedAddress ?? undefined)?.catch((error) => {
    //   setAttempting(false)
    //   console.log(error)
    // })

    if (hash) {
      setHash(hash)
    }
  }

  return (
    <Modal isOpen={isOpen} onDismiss={wrappedOnDismiss} maxHeight={90}>
      {!attempting && (
        <ContentWrapper gap="lg">
          <AutoColumn gap="lg" justify="center">
            <RowBetween>
              <ThemedText.DeprecatedMediumHeader fontWeight={500}>{title}</ThemedText.DeprecatedMediumHeader>
              <StyledClosed stroke="black" onClick={wrappedOnDismiss} />
            </RowBetween>
            {/* BLOCKYTODO: zrobić komponent input */}
            <ExchangeHmtInput value={currencyToExchange} onChange={onInputHmtExchange} className="hmt-exchange-input" />
            <ButtonPrimary disabled={!isAddress(parsedAddress ?? '')} onClick={onDepositHmtSubmit}>
              <ThemedText.DeprecatedMediumHeader color="white">
                <Trans>Confirm</Trans>
              </ThemedText.DeprecatedMediumHeader>
            </ButtonPrimary>
          </AutoColumn>
        </ContentWrapper>
      )}
      {attempting && (
        <LoadingView onDismiss={wrappedOnDismiss}>
          <AutoColumn gap="md" justify="center">
            <ThemedText.DeprecatedLargeHeader>
              <Trans>{`Exchanging ${currencyToExchange} HMT into vHMT`}</Trans>
            </ThemedText.DeprecatedLargeHeader>
            <ThemedText.DeprecatedMain fontSize={36}>Please wait</ThemedText.DeprecatedMain>
          </AutoColumn>
        </LoadingView>
      )}
      {hash && (
        <SubmittedView onDismiss={wrappedOnDismiss} hash={hash}>
          <AutoColumn gap="md" justify="center">
            <ThemedText.DeprecatedLargeHeader>
              <Trans>Transaction Submitted</Trans>
            </ThemedText.DeprecatedLargeHeader>
            <ThemedText.DeprecatedMain fontSize={36}>{formatCurrencyAmount(hmtBalance, 4)}</ThemedText.DeprecatedMain>
          </AutoColumn>
        </SubmittedView>
      )}
    </Modal>
  )
}
