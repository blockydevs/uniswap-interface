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
import styled, { useTheme } from 'styled-components/macro'

import { ThemedText } from '../../theme'
import { ButtonPrimary } from '../Button'
import { AutoColumn } from '../Column'
import Modal from '../Modal'
import { LoadingView, SubmittedView, SubmittedWithErrorView } from '../ModalViews'
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
  const theme = useTheme()
  const userHmtBalanceAmount = hmtBalance && Number(hmtBalance.toExact())

  const [attempting, setAttempting] = useState(false)
  const [currencyToExchange, setCurrencyToExchange] = useState<string>('')
  const [approveHash, setApproveHash] = useState<string | undefined>()
  const [depositForHash, setDepositForHash] = useState<string | undefined>()
  const [error, setError] = useState<string>('')
  const [isTransactionApproved, setIsTransactionApproved] = useState<boolean>(false)
  const [isApproveWaitResponse, setIsApproveWaitResponse] = useState<boolean>(false)

  // wrapper to reset state on modal close
  function wrappedOnDismiss() {
    setApproveHash(undefined)
    setDepositForHash(undefined)
    setAttempting(false)
    setIsTransactionApproved(false)
    setIsApproveWaitResponse(false)
    setError('')
    onDismiss()
  }

  function onInputHmtExchange(value: string) {
    setCurrencyToExchange(value)
    setError('')
  }

  function onInputMaxExchange(maxValue: string | undefined) {
    maxValue && setCurrencyToExchange(maxValue)
    setError('')
  }

  async function onTransactionApprove() {
    if (!uniContract || !hmtUniContract) return
    if (currencyToExchange.length === 0) {
      setError(ExchangeInputErrors.EMPTY_INPUT)
      return
    }
    if (userHmtBalanceAmount && userHmtBalanceAmount < Number(currencyToExchange)) {
      setError(ExchangeInputErrors.EXCEEDS_BALANCE)
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
      await onDepositHmtSubmit()
    }

    setIsApproveWaitResponse(Boolean(approveResponse))
  }

  async function onDepositHmtSubmit() {
    if (!uniContract) return

    const convertedCurrency = parseUnits(currencyToExchange, hmtContractToken?.decimals).toString()

    try {
      setAttempting(true)
      const response = await uniContract.depositFor(account, convertedCurrency)
      setDepositForHash(response ? response.hash : undefined)
      setIsTransactionApproved(response ? true : false)
    } catch {
      setError('Unable to execute transaction')
      setAttempting(false)
      setIsTransactionApproved(false)

      // BLOCKYTODO: w przyszłości można spróbować zastosować paczkę eth-rpc-errors i wyświetlać dokładniejsze komunikaty błędów ponieważ wiadomość error jest zbyt ogólna
    }
  }

  const isDepositFullySubmitted = attempting && Boolean(depositForHash) && isTransactionApproved
  const isDepositError = !attempting && Boolean(approveHash) && Boolean(error) && !isTransactionApproved

  return (
    <Modal isOpen={isOpen} onDismiss={wrappedOnDismiss} maxHeight={90}>
      {!attempting && !approveHash && !depositForHash && isOpen && (
        <ContentWrapper gap="lg">
          <AutoColumn gap="lg" justify="center">
            <RowBetween>
              <ThemedText.DeprecatedMediumHeader fontWeight={500}>{title}</ThemedText.DeprecatedMediumHeader>
              <StyledClosed stroke={theme.textPrimary} onClick={wrappedOnDismiss} />
            </RowBetween>
            <RowBetween>
              <ThemedText.BodySecondary>
                <Trans>HMT balance: {userHmtBalanceAmount}</Trans>
              </ThemedText.BodySecondary>
            </RowBetween>
            <ExchangeHmtInput
              value={currencyToExchange}
              maxValue={hmtBalance?.toExact()}
              onChange={onInputHmtExchange}
              onMaxChange={onInputMaxExchange}
              error={error}
              className="hmt-deposit-input"
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
            <ThemedText.DeprecatedMain fontSize={36} textAlign="center">
              <Trans>
                {approveHash ? 'Wait for approve confirmation' : 'Please confirm your approve in metamask wallet'}
              </Trans>
            </ThemedText.DeprecatedMain>
            {isApproveWaitResponse && Boolean(!error) && (
              <ThemedText.BodyPrimary textAlign="center" fontSize={32} marginBottom={36} marginTop={36}>
                <span>{currencyToExchange} </span>
                HMT will be deposited
              </ThemedText.BodyPrimary>
            )}
          </AutoColumn>
        </LoadingView>
      )}

      {isDepositFullySubmitted && (
        <SubmittedView onDismiss={wrappedOnDismiss} hash={depositForHash}>
          <AutoColumn gap="md" justify="center">
            <ThemedText.DeprecatedLargeHeader>
              <Trans>Transaction Submitted</Trans>
            </ThemedText.DeprecatedLargeHeader>
          </AutoColumn>
        </SubmittedView>
      )}
      {isDepositError && (
        <SubmittedWithErrorView onDismiss={wrappedOnDismiss}>
          <AutoColumn gap="md" justify="center">
            <ThemedText.DeprecatedLargeHeader>
              <Trans>{error}</Trans>
            </ThemedText.DeprecatedLargeHeader>
          </AutoColumn>
        </SubmittedWithErrorView>
      )}
    </Modal>
  )
}
