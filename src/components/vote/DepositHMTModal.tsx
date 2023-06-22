import { parseUnits } from '@ethersproject/units'
import { Trans } from '@lingui/macro'
import { useWeb3React } from '@web3-react/core'
import ExchangeHmtInput from 'components/ExchangeHmtInput/ExchangeHmtInput'
import { useHmtContractToken } from 'lib/hooks/useCurrencyBalance'
import { ReactNode, useCallback, useState } from 'react'
import { X } from 'react-feather'
import { useUniContract } from 'state/governance/hooks'
import { useHMTUniContract } from 'state/governance/hooks'
import { ExchangeInputErrors } from 'state/governance/types'
import { useTransactionAdder } from 'state/transactions/hooks'
import { TransactionType } from 'state/transactions/types'
import styled, { useTheme } from 'styled-components/macro'
import { swapErrorToUserReadableMessage } from 'utils/swapErrorToUserReadableMessage'

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
  setBalanceRefreshKey: any
  hmtBalance: any
  //BLOCKYTODO: any zamienić na prawidłowe typowanie
}

export default function DepositHMTModal({
  isOpen,
  onDismiss,
  title,
  setBalanceRefreshKey,
  hmtBalance,
}: DepositHMTProps) {
  const { account } = useWeb3React()
  const hmtUniContract = useHMTUniContract()
  const hmtContractToken = useHmtContractToken()
  const uniContract = useUniContract()
  const theme = useTheme()
  const userHmtBalanceAmount = hmtBalance && Number(hmtBalance.toExact())
  const addTransaction = useTransactionAdder()

  const [attempting, setAttempting] = useState(false)
  const [currencyToExchange, setCurrencyToExchange] = useState<string>('')
  const [approveHash, setApproveHash] = useState<string | undefined>()
  const [depositForHash, setDepositForHash] = useState<string | undefined>()
  const [validationInputError, setValidationInputError] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isTransactionApproved, setIsTransactionApproved] = useState<boolean>(false)

  const [isApproveWaitResponse, setIsApproveWaitResponse] = useState<boolean>(false)

  // wrapper to reset state on modal close
  function wrappedOnDismiss() {
    setAttempting(false)
    setCurrencyToExchange('')
    setApproveHash(undefined)
    setDepositForHash(undefined)
    setValidationInputError('')
    setError('')
    setIsTransactionApproved(false)
    setIsApproveWaitResponse(false)
    onDismiss()
  }

  function onInputHmtExchange(value: string) {
    setCurrencyToExchange(value)
    setValidationInputError('')
  }

  function onInputMaxExchange(maxValue: string | undefined) {
    maxValue && setCurrencyToExchange(maxValue)
    setValidationInputError('')
  }

  const transactionAdder = useCallback(
    (response: any, convertedCurrency: string) => {
      //BLOCKYTODO: any zamienić na prawidłowe typowanie
      addTransaction(response, {
        type: TransactionType.EXCHANGE_CURRENCY,
        spender: account,
        currencyAmount: convertedCurrency,
      })
    },
    [account, addTransaction]
  )

  async function onTransactionApprove() {
    if (!uniContract || !hmtUniContract) return
    if (currencyToExchange.length === 0 || currencyToExchange === '0') {
      setValidationInputError(ExchangeInputErrors.EMPTY_INPUT)
      return
    }
    if (userHmtBalanceAmount && userHmtBalanceAmount < Number(currencyToExchange)) {
      setValidationInputError(ExchangeInputErrors.EXCEEDS_BALANCE)
      return
    }

    try {
      setAttempting(true)
      const convertedCurrency = parseUnits(currencyToExchange, hmtContractToken?.decimals).toString()

      const response = await hmtUniContract.approve(uniContract.address, convertedCurrency)

      if (response) setApproveHash(response.hash)

      const approveResponse = await response.wait()

      if (approveResponse.status === 1) {
        setIsTransactionApproved(true)
        await onDepositHmtSubmit()
      }

      setIsApproveWaitResponse(Boolean(approveResponse))
    } catch (error) {
      setError(error)
      setAttempting(false)
    }
  }

  async function onDepositHmtSubmit() {
    if (!uniContract) return

    const convertedCurrency = parseUnits(currencyToExchange, hmtContractToken?.decimals).toString()

    try {
      setAttempting(true)
      const response = await uniContract.depositFor(account, convertedCurrency)
      transactionAdder(response, convertedCurrency)
      setDepositForHash(response ? response.hash : undefined)

      const depositWaitResponse = await response.wait()
      if (depositWaitResponse) setBalanceRefreshKey((prevKey: number) => prevKey + 1)
    } catch (error) {
      setError(error)
      setAttempting(false)
      setIsTransactionApproved(false)

      // BLOCKYTODO: w przyszłości można spróbować zastosować paczkę eth-rpc-errors i wyświetlać dokładniejsze komunikaty błędów ponieważ wiadomość error jest zbyt ogólna
    }
  }

  const isDepositFullySubmitted = attempting && Boolean(depositForHash) && isTransactionApproved
  const isDepositError = !attempting && Boolean(error) && !isTransactionApproved

  return (
    <Modal isOpen={isOpen || !!error || isApproveWaitResponse} onDismiss={wrappedOnDismiss} maxHeight={90}>
      {!attempting && !approveHash && !depositForHash && isOpen && !error && (
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
              error={validationInputError}
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
      {attempting && !depositForHash && !isApproveWaitResponse && !validationInputError && (
        <LoadingView onDismiss={wrappedOnDismiss}>
          <AutoColumn gap="md" justify="center">
            <ThemedText.DeprecatedMain fontSize={36} textAlign="center">
              <Trans>
                {approveHash && !isTransactionApproved
                  ? 'Please wait for the approve transaction to be confirmed'
                  : 'Please confirm the transaction in your wallet'}
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
            <ThemedText.DeprecatedError error={!!error}>
              <Trans>Unable to execute transaction</Trans>
            </ThemedText.DeprecatedError>
            {error && (
              <ContentWrapper gap="10px">
                <ThemedText.DeprecatedLargeHeader textAlign="center">
                  <Trans>Reason</Trans>:
                </ThemedText.DeprecatedLargeHeader>
                <ThemedText.DeprecatedMediumHeader>
                  {swapErrorToUserReadableMessage(error)}
                </ThemedText.DeprecatedMediumHeader>
              </ContentWrapper>
            )}
          </AutoColumn>
        </SubmittedWithErrorView>
      )}
    </Modal>
  )
}
