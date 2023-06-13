import { isAddress } from '@ethersproject/address'
import { parseUnits } from '@ethersproject/units'
import { Trans } from '@lingui/macro'
import { useWeb3React } from '@web3-react/core'
import ExchangeHmtInput from 'components/ExchangeHmtInput/ExchangeHmtInput'
import { useHmtContractToken, useTokenBalance } from 'lib/hooks/useCurrencyBalance'
import { ReactNode, useState } from 'react'
import { X } from 'react-feather'
import { useUniContract } from 'state/governance/hooks'
import { useHMTUniContract } from 'state/governance/hooks'
import { ExchangeInputErrors } from 'state/governance/types'
import styled from 'styled-components/macro'

import useENS from '../../hooks/useENS'
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
  const { address: parsedAddress } = useENS(account)
  const hmtUniContract = useHMTUniContract()
  const hmtContractToken = useHmtContractToken()
  const uniContract = useUniContract()
  const hmtBalance = useTokenBalance(account ?? undefined, chainId ? hmtContractToken : undefined)
  const userHmtBalanceAmount = hmtBalance && Number(hmtBalance.numerator.toString())

  const [attempting, setAttempting] = useState(false)
  const [currencyToExchange, setCurrencyToExchange] = useState<string>('')
  const [approveHash, setApproveHash] = useState<string | undefined>()
  const [depositForHash, setDepositForHash] = useState<string | undefined>()
  const [error, setError] = useState<string>('')

  // wrapper to reset state on modal close
  function wrappedOnDismiss() {
    setApproveHash(undefined)
    setAttempting(false)
    onDismiss()
  }

  function onInputHmtExchange(value: string) {
    setCurrencyToExchange(value)
    setError('')
  }

  async function onTransactionApprove() {
    if (!uniContract || !hmtUniContract) return
    if (currencyToExchange.length === 0) {
      setError(ExchangeInputErrors.EMPTY_INPUT)
      setAttempting(false)
      return
    }
    if (userHmtBalanceAmount && userHmtBalanceAmount < Number(currencyToExchange)) {
      setError(ExchangeInputErrors.EXCEEDS_BALANCE)
      setAttempting(false)
      return
    }

    setAttempting(true)

    const convertedCurrency = parseUnits(currencyToExchange, hmtContractToken?.decimals).toString()

    const response = await hmtUniContract.approve(uniContract.address, convertedCurrency).catch((error: Error) => {
      setAttempting(false)
      console.log(error)
      // BLOCKYTODO: dodać bardziej złożoną obsługę błędów schodzących z kontraktu
    })
    if (response) setApproveHash(response.hash)
  }

  async function onDepositHmtSubmit() {
    if (!uniContract) return
    const response = await uniContract.depositFor(account, currencyToExchange).catch((error: Error) => {
      setAttempting(false)
      console.log(error)
    })
    if (response) setDepositForHash(response.hash)
  }

  const isTransactionFullySubmitted = attempting && approveHash && depositForHash

  return (
    <Modal isOpen={isOpen} onDismiss={wrappedOnDismiss} maxHeight={90}>
      {!attempting && (
        <ContentWrapper gap="lg">
          <AutoColumn gap="lg" justify="center">
            <RowBetween>
              <ThemedText.DeprecatedMediumHeader fontWeight={500}>{title}</ThemedText.DeprecatedMediumHeader>
              <StyledClosed stroke="black" onClick={wrappedOnDismiss} />
            </RowBetween>
            <ExchangeHmtInput
              value={currencyToExchange}
              onChange={onInputHmtExchange}
              error={error}
              className="hmt-exchange-input"
            />
            <ButtonPrimary disabled={!!error} onClick={onTransactionApprove}>
              <ThemedText.DeprecatedMediumHeader color="white">
                <Trans>Confirm</Trans>
              </ThemedText.DeprecatedMediumHeader>
            </ButtonPrimary>
          </AutoColumn>
        </ContentWrapper>
      )}
      {attempting && !approveHash && !depositForHash && (
        <LoadingView onDismiss={wrappedOnDismiss}>
          <AutoColumn gap="md" justify="center">
            <ThemedText.DeprecatedLargeHeader>
              <Trans>Approving...</Trans>
            </ThemedText.DeprecatedLargeHeader>
            <ThemedText.DeprecatedMain fontSize={36}>Please wait</ThemedText.DeprecatedMain>
          </AutoColumn>
        </LoadingView>
      )}
      {attempting && approveHash && !depositForHash && (
        <LoadingView onDismiss={wrappedOnDismiss}>
          <AutoColumn gap="md" justify="center">
            <ThemedText.DeprecatedMain textAlign="center" fontSize={32}>
              <span>{currencyToExchange} </span>
              HMT will be exchanged to vHMT
            </ThemedText.DeprecatedMain>
            <ButtonPrimary disabled={!isAddress(parsedAddress ?? '')} onClick={onDepositHmtSubmit}>
              <ThemedText.DeprecatedMediumHeader color="white">
                <Trans>Confirm deposit</Trans>
              </ThemedText.DeprecatedMediumHeader>
            </ButtonPrimary>
          </AutoColumn>
        </LoadingView>
      )}
      {isTransactionFullySubmitted && (
        <SubmittedView onDismiss={wrappedOnDismiss} hash={depositForHash}>
          <AutoColumn gap="md" justify="center">
            <ThemedText.DeprecatedLargeHeader>
              <Trans>Transaction Submitted</Trans>
            </ThemedText.DeprecatedLargeHeader>
          </AutoColumn>
        </SubmittedView>
      )}
    </Modal>
  )
}
