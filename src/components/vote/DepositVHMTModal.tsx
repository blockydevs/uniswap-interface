import { Trans } from '@lingui/macro'
import { useWeb3React } from '@web3-react/core'
import ExchangeHmtInput from 'components/ExchangeHmtInput/ExchangeHmtInput'
import { parseUnits } from 'ethers/lib/utils'
import { useTokenBalance } from 'lib/hooks/useCurrencyBalance'
import { ReactNode, useState } from 'react'
import { X } from 'react-feather'
import { useUniContract } from 'state/governance/hooks'
import { ExchangeInputErrors } from 'state/governance/types'
import styled, { useTheme } from 'styled-components/macro'

import { UNI } from '../../constants/tokens'
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

interface DepositVHMTProps {
  isOpen: boolean
  onDismiss: () => void
  title: ReactNode
}

export default function DepositVHMTModal({ isOpen, onDismiss, title }: DepositVHMTProps) {
  const { account, chainId } = useWeb3React()
  const uniContract = useUniContract()
  const uniBalance = useTokenBalance(account ?? undefined, chainId ? UNI[chainId] : undefined)
  const userVHMTBalanceAmount = uniBalance && Number(uniBalance.toExact())
  const theme = useTheme()

  const [attempting, setAttempting] = useState(false)
  const [currencyToExchange, setCurrencyToExchange] = useState<string>('')
  const [withdrawToHash, setWithdrawToHash] = useState<string | undefined>()
  const [error, setError] = useState<string>('')

  // wrapper to reset state on modal close
  function wrappedOnDismiss() {
    setWithdrawToHash(undefined)
    setAttempting(false)
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

  async function onWithdrawToVHMTSubmit() {
    if (!uniContract) return
    if (currencyToExchange.length === 0) {
      setError(ExchangeInputErrors.EMPTY_INPUT)
      setAttempting(false)
      return
    }
    if (userVHMTBalanceAmount && userVHMTBalanceAmount < Number(currencyToExchange)) {
      setError(ExchangeInputErrors.EXCEEDS_BALANCE)
      setAttempting(false)
      return
    }

    setAttempting(true)

    const convertedCurrency = parseUnits(currencyToExchange, uniBalance?.currency.decimals).toString()

    const response = await uniContract.withdrawTo(account, convertedCurrency).catch((error: Error) => {
      setAttempting(false)
      console.log(error)
    })
    if (response) setWithdrawToHash(response.hash)
  }

  return (
    <Modal isOpen={isOpen} onDismiss={wrappedOnDismiss} maxHeight={90}>
      {!attempting && (
        <ContentWrapper gap="lg">
          <AutoColumn gap="lg" justify="center">
            <RowBetween>
              <ThemedText.DeprecatedMediumHeader fontWeight={500}>{title}</ThemedText.DeprecatedMediumHeader>
              <StyledClosed stroke={theme.textPrimary} onClick={wrappedOnDismiss} />
            </RowBetween>
            <RowBetween>
              <ThemedText.BodySecondary>
                <Trans>vHMT balance: {userVHMTBalanceAmount}</Trans>
              </ThemedText.BodySecondary>
            </RowBetween>
            <ExchangeHmtInput
              value={currencyToExchange}
              maxValue={uniBalance?.toExact()}
              onChange={onInputHmtExchange}
              onMaxChange={onInputMaxExchange}
              error={error}
              className="hmt-withdraw-input"
            />
            <ButtonPrimary disabled={!!error} onClick={onWithdrawToVHMTSubmit}>
              <ThemedText.DeprecatedMediumHeader color="white">
                <Trans>Confirm</Trans>
              </ThemedText.DeprecatedMediumHeader>
            </ButtonPrimary>
          </AutoColumn>
        </ContentWrapper>
      )}
      {attempting && !withdrawToHash && (
        <LoadingView onDismiss={wrappedOnDismiss}>
          <AutoColumn gap="md" justify="center">
            <ThemedText.DeprecatedLargeHeader>
              <Trans>Approving...</Trans>
            </ThemedText.DeprecatedLargeHeader>
            <ThemedText.DeprecatedMain fontSize={36}>Please wait</ThemedText.DeprecatedMain>
          </AutoColumn>
        </LoadingView>
      )}
      {attempting && withdrawToHash && (
        <SubmittedView onDismiss={wrappedOnDismiss} hash={withdrawToHash}>
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
