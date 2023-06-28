import { Trans } from '@lingui/macro'
import { Trace } from '@uniswap/analytics'
import { InterfacePageName } from '@uniswap/analytics-events'
import { CurrencyAmount, Token } from '@uniswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import ExecuteModal from 'components/vote/ExecuteModal'
import QueueModal from 'components/vote/QueueModal'
import { useActiveLocale } from 'hooks/useActiveLocale'
import useCurrentBlockTimestamp from 'hooks/useCurrentBlockTimestamp'
import JSBI from 'jsbi'
import useBlockNumber from 'lib/hooks/useBlockNumber'
import ms from 'ms.macro'
import { Box } from 'nft/components/Box'
import { WarningCircleIcon } from 'nft/components/icons'
import { useState } from 'react'
import { ArrowLeft } from 'react-feather'
import ReactMarkdown from 'react-markdown'
import { useParams } from 'react-router-dom'
import styled from 'styled-components/macro'
import { getDateFromBlock } from 'utils/getDateFromBlock'

import { ButtonPrimary } from '../../components/Button'
import { GrayCard } from '../../components/Card'
import { AutoColumn } from '../../components/Column'
import { CardSection, DataCard } from '../../components/earn/styled'
import { RowBetween, RowFixed } from '../../components/Row'
import { SwitchLocaleLink } from '../../components/SwitchLocaleLink'
import DelegateModal from '../../components/vote/DelegateModal'
import VoteModal from '../../components/vote/VoteModal'
import {
  AVERAGE_BLOCK_TIME_IN_SECS,
  COMMON_CONTRACT_NAMES,
  DEFAULT_AVERAGE_BLOCK_TIME_IN_SECS,
} from '../../constants/governance'
import { ZERO_ADDRESS } from '../../constants/misc'
import { UNI } from '../../constants/tokens'
import {
  useModalIsOpen,
  useToggleDelegateModal,
  useToggleExecuteModal,
  useToggleQueueModal,
  useToggleVoteModal,
} from '../../state/application/hooks'
import { ApplicationModal } from '../../state/application/reducer'
import { useTokenBalance } from '../../state/connection/hooks'
import {
  ProposalData,
  ProposalState,
  useProposalData,
  useQuorum,
  useUserDelegatee,
  useUserVotesAsOfBlock,
} from '../../state/governance/hooks'
import { VoteOption } from '../../state/governance/types'
import { ExternalLink, StyledInternalLink, ThemedText } from '../../theme'
import { isAddress } from '../../utils'
import { ExplorerDataType, getExplorerLink } from '../../utils/getExplorerLink'
import { ProposalStatus } from './styled'

const PageWrapper = styled(AutoColumn)`
  padding-top: 68px;
  width: 820px;

  @media only screen and (max-width: ${({ theme }) => `${theme.breakpoint.lg}px`}) {
    width: unset;
  }

  @media only screen and (max-width: ${({ theme }) => `${theme.breakpoint.md}px`}) {
    padding: 48px 8px 0px;
  }

  @media only screen and (max-width: ${({ theme }) => `${theme.breakpoint.sm}px`}) {
    padding-top: 20px;
  }
`

const ProposalInfo = styled(AutoColumn)`
  background: ${({ theme }) => theme.backgroundSurface};
  border-radius: 12px;
  padding: 1.5rem;
  position: relative;
  max-width: 820px;
  width: 100%;
`

const ArrowWrapper = styled(StyledInternalLink)`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 24px;
  color: ${({ theme }) => theme.textPrimary};
  font-size: 15px;
  font-weight: 600;

  a {
    color: ${({ theme }) => theme.textPrimary};
    text-decoration: none;
  }
  :hover {
    text-decoration: none;
  }
`

const StyledAutoColumn = styled(AutoColumn)`
  width: 100%;
  margin-top: 24px;

  @media only screen and (max-width: ${({ theme }) => `${theme.breakpoint.sm}px`}) {
    margin-top: 24px;
  }
`

const CardWrapper = styled.div`
  gap: 12px;
  width: 100%;
`

const StyledDataCard = styled(DataCard)`
  width: 100%;
  background: none;
  background-color: ${({ theme }) => theme.deprecated_bg1};
  height: fit-content;
  z-index: 2;
`

const ProgressWrapper = styled.div`
  width: 100%;
  margin-top: 1rem;
  height: 4px;
  border-radius: 4px;
  background-color: ${({ theme }) => theme.deprecated_bg3};
  position: relative;
`

const Progress = styled.div<{ percentageString?: string }>`
  height: 4px;
  border-radius: 4px;
  background-color: ${({ theme }) => theme.textPrimary};
  width: ${({ percentageString }) => percentageString ?? '0%'};
`

const MarkDownWrapper = styled.div`
  max-width: 640px;
  overflow: hidden;
`

const WrapSmall = styled(RowBetween)`
  ${({ theme }) => theme.deprecated_mediaWidth.deprecated_upToSmall`
    align-items: flex-start;
    flex-direction: column;
  `};
`

const DetailText = styled.div`
  color: ${({ theme }) => theme.textPrimary};
  word-break: break-all;

  span:nth-child(0),
  a {
    color: ${({ theme }) => theme.textVioletSecondary};
  }
`

const ProposerAddressLink = styled(ExternalLink)`
  word-break: break-all;
  color: ${({ theme }) => theme.textVioletSecondary};
`

const ButtonContainer = styled('div')`
  width: 100%;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 16px 24px;
  background: ${({ theme }) => theme.backgroundGray};
  border-radius: 7px;
`

const InnerButtonTextContainer = styled('div')`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
`

export default function VotePage() {
  // see https://github.com/remix-run/react-router/issues/8200#issuecomment-962520661
  const { governorIndex, id } = useParams() as { governorIndex: string; id: string }
  const parsedGovernorIndex = Number.parseInt(governorIndex)
  const { chainId, account } = useWeb3React()
  const quorumAmount = useQuorum()
  const quorumNumber = Number(quorumAmount?.toExact())

  // get data for this specific proposal
  const proposalData: ProposalData | undefined = useProposalData(parsedGovernorIndex, id)

  // update vote option based on button interactions
  const [voteOption, setVoteOption] = useState<VoteOption | undefined>(undefined)

  // modal for casting votes
  const showVoteModal = useModalIsOpen(ApplicationModal.VOTE)
  const toggleVoteModal = useToggleVoteModal()

  // toggle for showing delegation modal
  const showDelegateModal = useModalIsOpen(ApplicationModal.DELEGATE)
  const toggleDelegateModal = useToggleDelegateModal()

  // toggle for showing queue modal
  const showQueueModal = useModalIsOpen(ApplicationModal.QUEUE)
  const toggleQueueModal = useToggleQueueModal()

  // toggle for showing execute modal
  const showExecuteModal = useModalIsOpen(ApplicationModal.EXECUTE)
  const toggleExecuteModal = useToggleExecuteModal()

  // get and format date from data
  const currentTimestamp = useCurrentBlockTimestamp()
  const currentBlock = useBlockNumber()

  const startDate = getDateFromBlock(
    proposalData?.startBlock,
    currentBlock,
    (chainId && AVERAGE_BLOCK_TIME_IN_SECS[chainId]) ?? DEFAULT_AVERAGE_BLOCK_TIME_IN_SECS,
    currentTimestamp
  )
  const endDate = getDateFromBlock(
    proposalData?.endBlock,
    currentBlock,
    (chainId && AVERAGE_BLOCK_TIME_IN_SECS[chainId]) ?? DEFAULT_AVERAGE_BLOCK_TIME_IN_SECS,
    currentTimestamp
  )
  const now = new Date()
  const locale = useActiveLocale()
  const dateFormat: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'short',
  }
  // convert the eta to milliseconds before it's a date
  const eta = proposalData?.eta ? new Date(proposalData.eta.mul(ms`1 second`).toNumber()) : undefined

  // get total votes and format percentages for UI
  const totalVotes = proposalData?.forCount?.add(proposalData.againstCount).add(proposalData.abstainCount)

  const forVotes = Number(proposalData?.forCount.toExact())
  const againstVotes = Number(proposalData?.againstCount.toExact())
  const abstainVotes = Number(proposalData?.abstainCount.toExact())

  const quorumPercentage = ((forVotes + againstVotes + abstainVotes) / quorumNumber) * 100

  // only count available votes as of the proposal start block
  const availableVotes: CurrencyAmount<Token> | undefined = useUserVotesAsOfBlock(proposalData?.startBlock ?? undefined)

  // only show voting if user has > 0 votes at proposal start block and proposal is active,
  const showVotingButtons =
    availableVotes &&
    JSBI.greaterThan(availableVotes.quotient, JSBI.BigInt(0)) &&
    proposalData &&
    proposalData.status === ProposalState.ACTIVE

  // we only show the button if there's an account connected and the proposal state is correct
  const showQueueButton = account && proposalData?.status === ProposalState.SUCCEEDED

  // we only show the button if there's an account connected and the proposal state is correct
  const showExecuteButton = account && proposalData?.status === ProposalState.QUEUED

  const uniBalance: CurrencyAmount<Token> | undefined = useTokenBalance(
    account ?? undefined,
    chainId ? UNI[chainId] : undefined
  )
  const { userDelegatee }: { userDelegatee: string; isLoading: boolean } = useUserDelegatee()

  // in blurb link to home page if they are able to unlock
  const showLinkForUnlock = Boolean(
    uniBalance && JSBI.notEqual(uniBalance.quotient, JSBI.BigInt(0)) && userDelegatee === ZERO_ADDRESS
  )

  // show links in propsoal details if content is an address
  // if content is contract with common name, replace address with common name
  const linkIfAddress = (content: string) => {
    if (isAddress(content) && chainId) {
      const commonName = COMMON_CONTRACT_NAMES[chainId]?.[content] ?? content
      return (
        <ExternalLink href={getExplorerLink(chainId, content, ExplorerDataType.ADDRESS)}>{commonName}</ExternalLink>
      )
    }
    return <span>{content}</span>
  }

  function MarkdownImage({ ...rest }) {
    return <img {...rest} style={{ width: '100%', height: '100$', objectFit: 'cover' }} alt="" />
  }

  return (
    <Trace page={InterfacePageName.VOTE_PAGE} shouldLogImpression>
      <>
        <PageWrapper gap="lg" justify="center">
          <VoteModal
            isOpen={showVoteModal}
            onDismiss={toggleVoteModal}
            proposalId={proposalData?.id}
            voteOption={voteOption}
            availableVotes={availableVotes}
            id={id}
          />
          <DelegateModal
            isOpen={showDelegateModal}
            onDismiss={toggleDelegateModal}
            title={<Trans>Unlock Votes</Trans>}
          />
          <QueueModal isOpen={showQueueModal} onDismiss={toggleQueueModal} proposalId={proposalData?.id} />
          <ExecuteModal isOpen={showExecuteModal} onDismiss={toggleExecuteModal} proposalId={proposalData?.id} />
          <ProposalInfo gap="lg" justify="start">
            <RowBetween style={{ width: '100%' }}>
              <ArrowWrapper to="/">
                <Trans>
                  <ArrowLeft size={20} /> Proposals
                </Trans>
              </ArrowWrapper>
              {proposalData && <ProposalStatus status={proposalData.status} />}
            </RowBetween>
            <StyledAutoColumn gap="10px">
              <ThemedText.SubHeaderLarge style={{ marginBottom: '.5rem' }}>
                {proposalData?.title}
              </ThemedText.SubHeaderLarge>
              <RowBetween>
                <ThemedText.DeprecatedMain>
                  {startDate && startDate > now ? (
                    <Trans>Voting starts approximately {startDate.toLocaleString(locale, dateFormat)}</Trans>
                  ) : null}
                </ThemedText.DeprecatedMain>
              </RowBetween>
              <RowBetween>
                <ThemedText.DeprecatedMain>
                  {endDate &&
                    (endDate < now ? (
                      <Trans>Voting ended {endDate.toLocaleString(locale, dateFormat)}</Trans>
                    ) : (
                      <Trans>Voting ends approximately {endDate.toLocaleString(locale, dateFormat)}</Trans>
                    ))}
                </ThemedText.DeprecatedMain>
              </RowBetween>
              {proposalData && proposalData.status === ProposalState.ACTIVE && showVotingButtons === false && (
                <GrayCard>
                  <Box>
                    <WarningCircleIcon />
                  </Box>
                  <Trans>
                    Only vHMT votes that were self delegated before block {proposalData.startBlock} are eligible for
                    voting.
                  </Trans>{' '}
                  {showLinkForUnlock && (
                    <span>
                      <Trans>
                        <StyledInternalLink to="/vote">Unlock voting</StyledInternalLink> to prepare for the next
                        proposal.
                      </Trans>
                    </span>
                  )}
                </GrayCard>
              )}
            </StyledAutoColumn>

            <RowFixed style={{ width: '100%', gap: '8px' }}>
              <ButtonContainer>
                <InnerButtonTextContainer>
                  <ThemedText.BodyPrimary fontSize={14}>
                    <Trans>Votes For</Trans>
                  </ThemedText.BodyPrimary>
                  <ThemedText.BodyPrimary fontSize={20} fontWeight={500}>
                    {forVotes}
                  </ThemedText.BodyPrimary>
                </InnerButtonTextContainer>

                <ButtonPrimary
                  padding="8px"
                  onClick={() => {
                    setVoteOption(VoteOption.For)
                    toggleVoteModal()
                  }}
                  disabled={!showVotingButtons}
                >
                  <ThemedText.BodyPrimary
                    fontSize={15}
                    color={proposalData?.status === ProposalState.PENDING || !showVotingButtons ? 'black' : 'white'}
                  >
                    <Trans>Vote For</Trans>
                  </ThemedText.BodyPrimary>
                </ButtonPrimary>
              </ButtonContainer>

              <ButtonContainer>
                <InnerButtonTextContainer>
                  <ThemedText.BodyPrimary fontSize={14}>
                    <Trans>Votes Against</Trans>
                  </ThemedText.BodyPrimary>
                  <ThemedText.BodyPrimary fontSize={20} fontWeight={500}>
                    {againstVotes}
                  </ThemedText.BodyPrimary>
                </InnerButtonTextContainer>

                <ButtonPrimary
                  padding="8px"
                  onClick={() => {
                    setVoteOption(VoteOption.Against)
                    toggleVoteModal()
                  }}
                  disabled={!showVotingButtons}
                >
                  <ThemedText.BodyPrimary
                    fontSize={15}
                    color={proposalData?.status === ProposalState.PENDING || !showVotingButtons ? 'black' : 'white'}
                  >
                    <Trans>Vote Against</Trans>
                  </ThemedText.BodyPrimary>
                </ButtonPrimary>
              </ButtonContainer>

              <ButtonContainer>
                <InnerButtonTextContainer>
                  <ThemedText.BodyPrimary fontSize={14}>
                    <Trans>Votes Abstain</Trans>
                  </ThemedText.BodyPrimary>
                  <ThemedText.BodyPrimary fontSize={20} fontWeight={500}>
                    {abstainVotes}
                  </ThemedText.BodyPrimary>
                </InnerButtonTextContainer>

                <ButtonPrimary
                  padding="8px"
                  onClick={() => {
                    setVoteOption(VoteOption.Abstain)
                    toggleVoteModal()
                  }}
                  disabled={!showVotingButtons}
                >
                  <ThemedText.BodyPrimary
                    fontSize={15}
                    color={proposalData?.status === ProposalState.PENDING || !showVotingButtons ? 'black' : 'white'}
                  >
                    <Trans>Abstain</Trans>
                  </ThemedText.BodyPrimary>
                </ButtonPrimary>
              </ButtonContainer>
            </RowFixed>

            {showQueueButton && (
              <RowFixed style={{ width: '100%', gap: '12px' }}>
                <ButtonPrimary
                  padding="8px"
                  onClick={() => {
                    toggleQueueModal()
                  }}
                >
                  <Trans>Queue</Trans>
                </ButtonPrimary>
              </RowFixed>
            )}
            {showExecuteButton && (
              <>
                {eta && (
                  <RowBetween>
                    <ThemedText.DeprecatedBlack>
                      <Trans>This proposal may be executed after {eta.toLocaleString(locale, dateFormat)}.</Trans>
                    </ThemedText.DeprecatedBlack>
                  </RowBetween>
                )}
                <RowFixed style={{ width: '100%', gap: '12px' }}>
                  <ButtonPrimary
                    padding="8px"
                    onClick={() => {
                      toggleExecuteModal()
                    }}
                    // can't execute until the eta has arrived
                    disabled={!currentTimestamp || !proposalData?.eta || currentTimestamp.lt(proposalData.eta)}
                  >
                    <Trans>Execute</Trans>
                  </ButtonPrimary>
                </RowFixed>
              </>
            )}
            <CardWrapper>
              <StyledDataCard>
                <CardSection>
                  <AutoColumn gap="md">
                    <WrapSmall>
                      <ThemedText.BodyPrimary>
                        <Trans>Quorum</Trans>
                      </ThemedText.BodyPrimary>
                      {proposalData && (
                        <ThemedText.BodyPrimary>
                          {totalVotes && totalVotes.toFixed(0, { groupSeparator: ',' })}
                          {quorumAmount && (
                            <span>
                              {` / ${quorumAmount.toExact({
                                groupSeparator: ',',
                              })}`}
                            </span>
                          )}
                        </ThemedText.BodyPrimary>
                      )}
                    </WrapSmall>
                  </AutoColumn>
                  <ProgressWrapper>
                    <Progress percentageString={`${quorumPercentage ?? 0}%`} />
                  </ProgressWrapper>
                </CardSection>
              </StyledDataCard>
            </CardWrapper>
            <AutoColumn gap="16px">
              <ThemedText.SubHeaderLarge>
                <Trans>Details</Trans>
              </ThemedText.SubHeaderLarge>
              {proposalData?.details?.map((d, i) => {
                return (
                  <DetailText key={i}>
                    {i + 1}: {linkIfAddress(d.target)}.{d.functionSig}(
                    {d.callData.split(',').map((content, i) => {
                      return (
                        <span key={i}>
                          {linkIfAddress(content)}
                          {d.callData.split(',').length - 1 === i ? '' : ','}
                        </span>
                      )
                    })}
                    )
                  </DetailText>
                )
              })}
            </AutoColumn>
            <AutoColumn gap="md">
              <ThemedText.SubHeaderLarge>
                <Trans>Description</Trans>
              </ThemedText.SubHeaderLarge>
              <MarkDownWrapper>
                <ReactMarkdown
                  source={proposalData?.description}
                  renderers={{
                    image: MarkdownImage,
                  }}
                />
              </MarkDownWrapper>
            </AutoColumn>
            <AutoColumn gap="md">
              <ThemedText.SubHeaderLarge>
                <Trans>Proposer</Trans>
              </ThemedText.SubHeaderLarge>
              <ProposerAddressLink
                href={
                  proposalData?.proposer && chainId
                    ? getExplorerLink(chainId, proposalData?.proposer, ExplorerDataType.ADDRESS)
                    : ''
                }
              >
                <ReactMarkdown source={proposalData?.proposer} />
              </ProposerAddressLink>
            </AutoColumn>
          </ProposalInfo>
        </PageWrapper>
        <SwitchLocaleLink />
      </>
    </Trace>
  )
}
