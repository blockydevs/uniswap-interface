import { Trans } from '@lingui/macro'
import styled, { DefaultTheme } from 'styled-components/macro'

import { ProposalState } from '../../state/governance/hooks'

const handleColorType = (status: ProposalState, theme: DefaultTheme) => {
  switch (status) {
    case ProposalState.PENDING:
    case ProposalState.ACTIVE:
      return theme.accentAction
    case ProposalState.SUCCEEDED:
    case ProposalState.EXECUTED:
      return theme.accentSuccess
    case ProposalState.DEFEATED:
      return theme.accentFailure
    case ProposalState.QUEUED:
    case ProposalState.CANCELED:
    case ProposalState.EXPIRED:
    default:
      return theme.textTertiary
  }
}

function StatusText({ status }: { status: ProposalState }) {
  switch (status) {
    case ProposalState.PENDING:
      return <Trans>Pending</Trans>
    case ProposalState.ACTIVE:
      return <Trans>Active</Trans>
    case ProposalState.SUCCEEDED:
      return <Trans>Succeeded</Trans>
    case ProposalState.EXECUTED:
      return <Trans>Executed</Trans>
    case ProposalState.DEFEATED:
      return <Trans>Defeated</Trans>
    case ProposalState.QUEUED:
      return <Trans>Queued</Trans>
    case ProposalState.CANCELED:
      return <Trans>Canceled</Trans>
    case ProposalState.EXPIRED:
      return <Trans>Expired</Trans>
    default:
      return <Trans>Undetermined</Trans>
  }
}

const StyledProposalContainer = styled.div<{ status: ProposalState }>`
  display: flex;
  font-size: 1rem;
  font-weight: 500;
  padding: 0.5rem;
  border-radius: 8px;
  color: ${({ status, theme }) => handleColorType(status, theme)};
  text-align: center;
  align-items: center;
  gap: 14px;
`

const Dot = styled.div<{ status: ProposalState }>`
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  background-color: ${({ status, theme }) => handleColorType(status, theme)};
`

export function ProposalStatus({ status }: { status: ProposalState }) {
  return (
    <StyledProposalContainer status={status}>
      <Dot status={status} />
      <StatusText status={status} />
    </StyledProposalContainer>
  )
}
