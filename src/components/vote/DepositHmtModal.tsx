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

interface DepositHMTProps {
  isOpen: boolean
  onDismiss: () => void
  title: ReactNode
}

export default function DepositHMTModal({ isOpen, onDismiss, title }: DepositHMTProps) {
  const { account, chainId } = useWeb3React()
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
  const [isTransactionApproved, setTransactionApproved] = useState<boolean>(false)

  // wrapper to reset state on modal close
  function wrappedOnDismiss() {
    setApproveHash(undefined)
    setDepositForHash(undefined)
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
      console.log(error)
      // BLOCKYTODO: dodać bardziej złożoną obsługę błędów schodzących z kontraktu
    })
    if (response) setApproveHash(response.hash)

    const approveResponse = await response.wait()

    if (approveResponse.status === 1) {
      setTransactionApproved(true)
      if (!isOpen) onDepositHmtSubmit()
    }
  }

  async function onDepositHmtSubmit() {
    if (!uniContract) return

    const convertedCurrency = parseUnits(currencyToExchange, hmtContractToken?.decimals).toString()

    const response = await uniContract.depositFor(account, convertedCurrency).catch((error: Error) => {
      setAttempting(false)
      console.log(error)
    })

    if (response) setDepositForHash(response.hash)
  }

  const isTransactionFullySubmitted = attempting && depositForHash && isTransactionApproved

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
              className="hmt-deposit-input"
              placeholder="How many HMT you want to deposit?"
            />
            <ButtonPrimary disabled={!!error} onClick={onTransactionApprove}>
              <ThemedText.DeprecatedMediumHeader color="white">
                <Trans>Confirm</Trans>
              </ThemedText.DeprecatedMediumHeader>
            </ButtonPrimary>
          </AutoColumn>
        </ContentWrapper>
      )}
      {attempting && !depositForHash && !isTransactionApproved && (
        <LoadingView onDismiss={wrappedOnDismiss}>
          <AutoColumn gap="md" justify="center">
            <ThemedText.DeprecatedLargeHeader>
              <Trans>{approveHash ? 'Approving...' : 'Confirm your approve'}</Trans>
              {/* BLOCKYTODO: zaimplementować approveHash oraz depositForHash jako stany pośrednie? */}
            </ThemedText.DeprecatedLargeHeader>
            <ThemedText.DeprecatedMain fontSize={36}>Please wait</ThemedText.DeprecatedMain>
          </AutoColumn>
        </LoadingView>
      )}
      {attempting && !depositForHash && isTransactionApproved && (
        <LoadingView onDismiss={wrappedOnDismiss}>
          <AutoColumn gap="md" justify="center">
            <ThemedText.DeprecatedMain textAlign="center" fontSize={32}>
              <span>{currencyToExchange} </span>
              HMT will be deposited
            </ThemedText.DeprecatedMain>
            <ButtonPrimary disabled={!!error} onClick={onDepositHmtSubmit}>
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
