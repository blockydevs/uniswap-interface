import { defaultAbiCoder, Interface } from '@ethersproject/abi'
import { isAddress } from '@ethersproject/address'
import { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import { TransactionResponse } from '@ethersproject/providers'
import { toUtf8String, Utf8ErrorFuncs, Utf8ErrorReason } from '@ethersproject/strings'
// eslint-disable-next-line no-restricted-imports
import { t } from '@lingui/macro'
import GovernorAlphaJSON from '@uniswap/governance/build/GovernorAlpha.json'
import { BigintIsh, CurrencyAmount, Token } from '@uniswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import GOVERNOR_HUB_ABI from 'abis/governance-hub.json'
import GOVERNOR_SPOKE_ABI from 'abis/governance-spoke.json'
import HmtUniJSON from 'abis/HMToken.json'
import UniJSON from 'abis/VHMToken.json'
import { GOVERNANCE_HUB_ADDRESS, GOVERNANCE_SPOKE_ADRESSES } from 'constants/addresses'
import { SupportedChainId } from 'constants/chains'
import { POLYGON_PROPOSAL_TITLE } from 'constants/proposals/polygon_proposal_title'
import { UNISWAP_GRANTS_PROPOSAL_DESCRIPTION } from 'constants/proposals/uniswap_grants_proposal_description'
import { RPC_PROVIDERS } from 'constants/providers'
import { useContract, useContractWithCustomProvider } from 'hooks/useContract'
import { useSingleCallResult } from 'lib/hooks/multicall'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppSelector } from 'state/hooks'
import { calculateGasMargin } from 'utils/calculateGasMargin'

import {
  BRAVO_START_BLOCK,
  MOONBEAN_START_BLOCK,
  ONE_BIP_START_BLOCK,
  POLYGON_START_BLOCK,
  UNISWAP_GRANTS_START_BLOCK,
} from '../../constants/proposals'
import { UNI } from '../../constants/tokens'
import { useLogs } from '../logs/hooks'
import { useTransactionAdder } from '../transactions/hooks'
import { TransactionType } from '../transactions/types'
import { VoteOption } from './types'

function useGovernanceHubContract(): Contract | null {
  // BLOCKYTODO: argument chainId który pozwoli odczytać prawidłowy spoke?
  return useContractWithCustomProvider(
    GOVERNANCE_HUB_ADDRESS,
    GOVERNOR_HUB_ABI,
    RPC_PROVIDERS[SupportedChainId.SEPOLIA]
  )
}

function useGovernanceSpokeContract(): Contract | null {
  return useContract(GOVERNANCE_SPOKE_ADRESSES, GOVERNOR_SPOKE_ABI)
}

export function useUniContract() {
  const { chainId } = useWeb3React()
  const uniAddress = useMemo(() => (chainId ? UNI[chainId]?.address : undefined), [chainId])
  return useContract(uniAddress, UniJSON.abi, true)
}

export function useHMTUniContract() {
  const uniContract = useUniContract()

  const [underlyingAddress, setUnderlyingAddress] = useState<string>('')

  useEffect(() => {
    const fetchUnderlyingAddress = async () => {
      if (uniContract) {
        try {
          const address = await uniContract.functions.underlying()
          setUnderlyingAddress(address[0])
        } catch (error) {
          console.log(error)
        }
      }
    }

    fetchUnderlyingAddress()
  }, [uniContract])

  return useContract(underlyingAddress, HmtUniJSON.abi, true)
}

interface ProposalDetail {
  target: string
  functionSig: string
  callData: string
}

export interface ProposalData {
  id: string
  title: string
  description: string
  proposer: string
  status: ProposalState
  hubForCount: CurrencyAmount<Token>
  hubAgainstCount: CurrencyAmount<Token>
  hubAbstainCount: CurrencyAmount<Token>
  spokeForCount: CurrencyAmount<Token>
  spokeAgainstCount: CurrencyAmount<Token>
  spokeAbstainCount: CurrencyAmount<Token>
  startBlock: number
  endBlock: number
  eta: BigNumber
  details: ProposalDetail[]
  governorIndex: number // index in the governance address array for which this proposal pertains
}

export interface CreateProposalData {
  targets: string[]
  values: string[]
  signatures: string[]
  calldatas: string[]
  description: string
}

interface ProposalVote {
  abstainVotes: BigintIsh
  againstVotes: BigintIsh
  forVotes: BigintIsh
}

export enum ProposalState {
  UNDETERMINED = -1,
  PENDING,
  ACTIVE,
  CANCELED,
  DEFEATED,
  SUCCEEDED,
  QUEUED,
  EXPIRED,
  EXECUTED,
}

const GovernanceInterface = new Interface(GovernorAlphaJSON.abi)

interface FormattedProposalLog {
  id: BigNumber
  description: string
  details: { target: string; functionSig: string; callData: string }[]
  proposer: string
  startBlock: number
  endBlock: number
}

const FOUR_BYTES_DIR: { [sig: string]: string } = {
  '0x5ef2c7f0': 'setSubnodeRecord(bytes32,bytes32,address,address,uint64)',
  '0x10f13a8c': 'setText(bytes32,string,string)',
  '0xb4720477': 'sendMessageToChild(address,bytes)',
  '0xa9059cbb': 'transfer(address,uint256)',
  '0x095ea7b3': 'approve(address,uint256)',
  '0x7b1837de': 'fund(address,uint256)',
}

/**
 * Need proposal events to get description data emitted from
 * new proposal event.
 */
function useFormattedProposalCreatedLogs(
  contract: Contract | null,
  fromBlock?: number,
  toBlock?: number
): FormattedProposalLog[] | undefined {
  // create filters for ProposalCreated events
  const filter = useMemo(() => {
    const filter = contract?.filters?.ProposalCreated()
    if (!filter) return undefined

    return {
      ...filter,
      fromBlock,
      toBlock,
    }
  }, [contract, fromBlock, toBlock])

  const useLogsResult = useLogs(filter)

  return useMemo(() => {
    return useLogsResult?.logs
      ?.map((log) => {
        const parsed = GovernanceInterface.parseLog(log).args

        return parsed
      })
      ?.map((parsed) => {
        let description!: string

        const startBlock = parseInt(parsed.startBlock?.toString())
        try {
          description = parsed.description
        } catch (error) {
          // replace invalid UTF-8 in the description with replacement characters
          let onError = Utf8ErrorFuncs.replace

          // Bravo proposal reverses the codepoints for U+2018 (‘) and U+2026 (…)
          if (startBlock === BRAVO_START_BLOCK) {
            const U2018 = [0xe2, 0x80, 0x98].toString()
            const U2026 = [0xe2, 0x80, 0xa6].toString()
            onError = (reason, offset, bytes, output) => {
              if (reason === Utf8ErrorReason.UNEXPECTED_CONTINUE) {
                const charCode = [bytes[offset], bytes[offset + 1], bytes[offset + 2]].reverse().toString()
                if (charCode === U2018) {
                  output.push(0x2018)
                  return 2
                } else if (charCode === U2026) {
                  output.push(0x2026)
                  return 2
                }
              }
              return Utf8ErrorFuncs.replace(reason, offset, bytes, output)
            }
          }

          description = JSON.parse(toUtf8String(error.error.value, onError)) || ''
        }

        // some proposals omit newlines
        if (
          startBlock === BRAVO_START_BLOCK ||
          startBlock === ONE_BIP_START_BLOCK ||
          startBlock === MOONBEAN_START_BLOCK
        ) {
          description = description.replace(/ {2}/g, '\n').replace(/\d\. /g, '\n$&')
        }
        const id = parsed.id
        const proposer = parsed.proposer
        return {
          id,
          description,
          details: parsed.targets.map((target: string, i: number) => {
            const signature = parsed.signatures[i]
            let calldata = parsed.calldatas[i]
            let name: string
            let types: string
            if (signature === '') {
              const fourbyte = calldata.slice(0, 10)
              const sig = FOUR_BYTES_DIR[fourbyte] ?? 'UNKNOWN()'
              if (!sig) throw new Error('Missing four byte sig')
              ;[name, types] = sig.substring(0, sig.length - 1).split('(')
              calldata = `0x${calldata.slice(10)}`
            } else {
              ;[name, types] = signature.substring(0, signature.length - 1).split('(')
            }
            const decoded = defaultAbiCoder.decode(types.split(','), calldata)
            return {
              target,
              functionSig: name,
              callData: decoded.join(', '),
            }
          }),

          proposer,
          startBlock,
          //HACK: endBlock wpisany na razie na sztywno
          endBlock: 0,
        }
      })
  }, [useLogsResult])
}

// get data for all past and active proposals
export function useAllProposalData(): { data: ProposalData[]; loading: boolean } {
  const [proposalStatuses, setProposalStatuses] = useState<number[]>([])
  const [proposalHubVotes, setProposalHubVotes] = useState<ProposalVote[]>([])
  const [proposalSpokeVotes, setProposalSpokeVotes] = useState<ProposalVote[]>([])

  const { chainId } = useWeb3React()
  const govHubContract = useGovernanceHubContract()
  const govSpokeContract = useGovernanceSpokeContract()
  const isHubChainActive = useAppSelector((state) => state.application.isHubChainActive)
  const transactions = useAppSelector((state) => state.transactions)

  // get metadata from past events
  const formattedLogsV2 = useFormattedProposalCreatedLogs(govHubContract)

  const govHubProposalIndexes = (formattedLogsV2 || []).map((item) => item.id)

  // get all proposal statuses
  useEffect(() => {
    async function getProposalStatuses() {
      const proposalStatesV2Promises = govHubProposalIndexes.map(async (id) => {
        const [status] = await govHubContract?.functions.state(id.toString(), {})
        return status
      })

      const proposalStatesV2 = await Promise.all(proposalStatesV2Promises)
      setProposalStatuses(proposalStatesV2)
    }

    if (govHubProposalIndexes.length > proposalStatuses.length) getProposalStatuses()
  }, [govHubContract, govHubProposalIndexes, proposalStatuses, transactions])

  //get proposal HUB votes
  useEffect(() => {
    async function getProposalVotes() {
      try {
        const proposalVotesV2Promises = govHubProposalIndexes.map(async (id: BigNumber) => {
          const votes = await govHubContract?.functions.proposalVotes(id.toString(), {})
          return votes
        })
        const proposalVotesV2 = await Promise.all(proposalVotesV2Promises)
        setProposalHubVotes(proposalVotesV2)
      } catch (error) {
        console.log(error)
      }
    }

    if (govHubProposalIndexes.length > proposalHubVotes.length) {
      // BLOCKYTODO: sprawdzic bez govHubProposalIndexes i proposalHubVotes
      getProposalVotes()
    }
  }, [govHubContract?.functions, govHubProposalIndexes, proposalHubVotes, chainId, isHubChainActive, transactions])

  //get proposal SPOKE votes
  useEffect(() => {
    async function getProposalSpokeVotes() {
      const proposalVotesV2Promises = govHubProposalIndexes.map(async (id: BigNumber) => {
        const votes = await govSpokeContract?.functions.proposalVotes(id.toString(), {})
        return votes
      })

      const proposalSpokeVotes = await Promise.all(proposalVotesV2Promises)
      setProposalSpokeVotes(proposalSpokeVotes)
    }

    if (govHubProposalIndexes.length > proposalSpokeVotes.length && !isHubChainActive) getProposalSpokeVotes()
  }, [govSpokeContract?.functions, govHubProposalIndexes, proposalSpokeVotes, chainId, isHubChainActive, transactions])

  const uniToken = useMemo(() => (chainId ? UNI[chainId] : undefined), [chainId])

  // early return until events are fetched
  return useMemo(() => {
    const proposalsCallData = [...(formattedLogsV2 || [])]

    const formattedLogs = [...(formattedLogsV2 ?? [])]

    if (!uniToken || (govHubContract && !formattedLogsV2)) {
      return { data: [], loading: true }
    }

    return {
      data: proposalsCallData.map((proposal, i) => {
        const startBlock = parseInt(proposal.startBlock?.toString())

        let description = formattedLogs[i]?.description ?? ''
        if (startBlock === UNISWAP_GRANTS_START_BLOCK) {
          description = UNISWAP_GRANTS_PROPOSAL_DESCRIPTION
        }

        let title = description?.split(/#+\s|\n/g)[1]
        if (startBlock === POLYGON_START_BLOCK) {
          title = POLYGON_PROPOSAL_TITLE
        }

        const forVotes = proposalHubVotes[i]?.forVotes || 0
        const againstVotes = proposalHubVotes[i]?.againstVotes || 0
        const abstainVotes = proposalHubVotes[i]?.abstainVotes || 0

        const spokeForVotes = proposalSpokeVotes[i]?.forVotes || 0
        const spokeAgainstVotes = proposalSpokeVotes[i]?.againstVotes || 0
        const spokeAbstainVotes = proposalSpokeVotes[i]?.abstainVotes || 0

        return {
          id: proposal.id.toString(),
          title: title ?? t`Untitled`,
          description: description ?? t`No description.`,
          proposer: proposal.proposer,
          status: proposalStatuses[i] ?? ProposalState.UNDETERMINED,
          hubForCount: CurrencyAmount.fromRawAmount(uniToken, forVotes),
          hubAgainstCount: CurrencyAmount.fromRawAmount(uniToken, againstVotes),
          hubAbstainCount: CurrencyAmount.fromRawAmount(uniToken, abstainVotes),
          spokeForCount: CurrencyAmount.fromRawAmount(uniToken, spokeForVotes),
          spokeAgainstCount: CurrencyAmount.fromRawAmount(uniToken, spokeAgainstVotes),
          spokeAbstainCount: CurrencyAmount.fromRawAmount(uniToken, spokeAbstainVotes),
          startBlock,
          endBlock: parseInt(proposal.endBlock?.toString()),
          eta: BigNumber.from(12),
          details: formattedLogs[i]?.details,
          governorIndex: 2, //TODO: check governorIndex usage
        }
      }),

      loading: false,
    }
  }, [formattedLogsV2, govHubContract, uniToken, proposalStatuses, proposalHubVotes, proposalSpokeVotes])
}

export function useProposalData(governorIndex: number, id: string): ProposalData | undefined {
  const { data } = useAllProposalData()
  return data.filter((p) => p.governorIndex === governorIndex)?.find((p) => p.id === id)
}

//get quorum value
export function useQuorum(): CurrencyAmount<Token> | undefined {
  const [quorum, setQuorum] = useState<number | undefined>(undefined)
  const { chainId } = useWeb3React()
  const uni = useMemo(() => (chainId ? UNI[chainId] : undefined), [chainId])
  const gov2 = useGovernanceHubContract()
  const { id } = useParams()

  useEffect(() => {
    async function getQuorum() {
      if (gov2?.functions && id) {
        const proposalSnapshot = await gov2.functions.proposalSnapshot(id.toString(), {})
        if (proposalSnapshot) {
          const quorumResponse = await gov2.functions.quorum(proposalSnapshot.toString(), {})
          setQuorum(quorumResponse)
        }
      }
    }

    getQuorum()
  }, [gov2?.functions, id])

  return quorum && uni ? CurrencyAmount.fromRawAmount(uni, quorum) : undefined
}

// get the users delegatee if it exists
export function useUserDelegatee(): { userDelegatee: string; isLoading: boolean } {
  const [userDelegatee, setUserDelegatee] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  const { account } = useWeb3React()
  const uniContract = useUniContract()
  const transactions = useAppSelector((state) => state.transactions)

  useEffect(() => {
    setIsLoading(true)
    async function getDelegatee() {
      if (uniContract) {
        try {
          const getDelegateeResponse = account && (await uniContract?.functions.delegates(account.toString()))
          setUserDelegatee(getDelegateeResponse)
        } catch (error) {
          console.log(error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    getDelegatee()
  }, [account, uniContract, transactions])

  return { userDelegatee, isLoading }
}

// gets the users current votes
export function useUserVotes(): { availableVotes: CurrencyAmount<Token> | undefined; isLoading: boolean } {
  const [availableVotes, setAvailableVotes] = useState<CurrencyAmount<Token> | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const { account, chainId } = useWeb3React()

  const uniContract = useUniContract()
  const transactions = useAppSelector((state) => state.transactions)

  const uni = useMemo(() => (chainId ? UNI[chainId] : undefined), [chainId])

  useEffect(() => {
    setIsLoading(true)
    async function getUserVotesFromUni() {
      if (uniContract) {
        try {
          const getVotesResponse = account && (await uniContract?.functions.getVotes(account.toString()))
          const getVotesParsed =
            uni && getVotesResponse ? CurrencyAmount.fromRawAmount(uni, getVotesResponse) : undefined
          setAvailableVotes(getVotesParsed)
        } catch (error) {
          console.log(error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    getUserVotesFromUni()
  }, [account, uniContract, uni, transactions])

  return { isLoading, availableVotes }
}

// fetch available votes as of block (usually proposal start block)
export function useUserVotesAsOfBlock(block: number | undefined, id: string): CurrencyAmount<Token> | undefined {
  const [userVotesAsOfBlockAmount, setUserVotesAsOfBlockAmount] = useState()

  const { account, chainId } = useWeb3React()
  const isHubChainActive = useAppSelector((state) => state.application.isHubChainActive)

  const governanceHubContract = useGovernanceHubContract()
  const governanceSpokeContract = useGovernanceSpokeContract()
  const spokeVoteTokenContract = useUniContract()

  const uni = useMemo(() => (chainId ? UNI[chainId] : undefined), [chainId])

  useEffect(() => {
    async function getUserVotesAsOfBlock() {
      if (isHubChainActive && block) {
        const getVotesAsOfBlockResponse =
          account && (await governanceHubContract?.functions.getVotes(account.toString(), block.toString()))
        setUserVotesAsOfBlockAmount(getVotesAsOfBlockResponse)
      } else if (!isHubChainActive && governanceSpokeContract) {
        const { localVoteStart } = await governanceSpokeContract.functions.proposals(id)

        const getVotesAsOfBlockResponse =
          account &&
          (await spokeVoteTokenContract?.functions.getPastVotes(account.toString(), localVoteStart.toString()))
        setUserVotesAsOfBlockAmount(getVotesAsOfBlockResponse)
      }
    }

    getUserVotesAsOfBlock()
  }, [block, isHubChainActive, account, governanceSpokeContract, spokeVoteTokenContract, governanceHubContract, id])

  return userVotesAsOfBlockAmount && uni ? CurrencyAmount.fromRawAmount(uni, userVotesAsOfBlockAmount) : undefined
}

export function useDelegateCallback(): (delegatee: string | undefined) => undefined | Promise<string> {
  const { account, chainId, provider } = useWeb3React()
  const addTransaction = useTransactionAdder()
  const uniContract = useUniContract()

  return useCallback(
    (delegatee: string | undefined) => {
      if (!provider || !chainId || !account || !delegatee || !isAddress(delegatee ?? '')) return undefined
      const args = [delegatee]
      if (!uniContract) throw new Error('No UNI Contract!')
      return uniContract.estimateGas.delegate(...args, {}).then((estimatedGasLimit) => {
        return uniContract
          .delegate(...args, { value: null, gasLimit: calculateGasMargin(estimatedGasLimit) })
          .then((response: TransactionResponse) => {
            addTransaction(response, {
              type: TransactionType.DELEGATE,
              delegatee,
            })
            return response.hash
          })
      })
    },
    [account, addTransaction, chainId, provider, uniContract]
  )
}

export function useVoteCallback(): (
  proposalId: string | undefined,
  voteOption: VoteOption
) => undefined | Promise<string> {
  const { account, chainId } = useWeb3React()
  const isHubChainActive = useAppSelector((state) => state.application.isHubChainActive)

  const contract = useContract(
    isHubChainActive ? GOVERNANCE_HUB_ADDRESS : GOVERNANCE_SPOKE_ADRESSES,
    isHubChainActive ? GOVERNOR_HUB_ABI : GOVERNOR_SPOKE_ABI
  )

  const addTransaction = useTransactionAdder()

  return useCallback(
    (proposalId: string | undefined, voteOption: VoteOption) => {
      if (!account || !contract || !proposalId || !chainId) return
      const args = [proposalId, voteOption === VoteOption.Against ? 0 : voteOption === VoteOption.For ? 1 : 2]
      return contract.estimateGas.castVote(...args, {}).then((estimatedGasLimit) => {
        return contract
          .castVote(...args, { value: null, gasLimit: calculateGasMargin(estimatedGasLimit) })
          .then((response: TransactionResponse) => {
            addTransaction(response, {
              type: TransactionType.VOTE,
              decision: voteOption,
              governorAddress: contract.address,
              proposalId: parseInt(proposalId),
              reason: '',
            })
            return response.hash
          })
      })
    },
    [account, addTransaction, contract, chainId]
  )
}

export function useRequestCollections(): (proposalId: string | undefined) => undefined | Promise<string> {
  const { account, chainId } = useWeb3React()
  const contract = useContract(GOVERNANCE_HUB_ADDRESS, GOVERNOR_HUB_ABI)
  const addTransaction = useTransactionAdder()

  return useCallback(
    (proposalId: string | undefined) => {
      if (!account || !contract || !proposalId || !chainId) return
      const args = [proposalId]
      return contract.estimateGas.requestCollections(...args, {}).then((estimatedGasLimit) => {
        return contract
          .requestCollections(...args, { value: null, gasLimit: calculateGasMargin(estimatedGasLimit) })
          .then((response: TransactionResponse) => {
            addTransaction(response, {
              type: TransactionType.REQUEST_COLLECTIONS,
              governorAddress: contract.address,
              proposalId: parseInt(proposalId),
            })
            return response.hash
          })
      })
    },
    [account, addTransaction, contract, chainId]
  )
}

export function useCollectionStatus(proposalId: string): {
  collectionStartedResponse: boolean | undefined
  collectionFinishedResponse: boolean | undefined
  loading: boolean
} {
  const [collectionStartedResponse, setCollectionStartedResponse] = useState<boolean | undefined>()
  const [collectionFinishedResponse, setCollectionFinishedResponse] = useState<boolean | undefined>()
  const [loading, setLoading] = useState<boolean>(true)

  const contract = useContract(GOVERNANCE_HUB_ADDRESS, GOVERNOR_HUB_ABI)
  const transactions = useAppSelector((state) => state.transactions)

  useEffect(() => {
    if (contract && proposalId) {
      setLoading(true)
      contract.collectionStarted(proposalId).then((response: boolean) => {
        setCollectionStartedResponse(response)
        setLoading(false)
      })
    }
  }, [contract, proposalId, transactions])

  useEffect(() => {
    if (!!collectionStartedResponse && contract && proposalId) {
      setLoading(true)
      contract.collectionFinished(proposalId).then((response: boolean) => {
        setCollectionFinishedResponse(response)
        setLoading(false)
      })
    }
  }, [contract, proposalId, transactions, collectionStartedResponse])

  return { collectionStartedResponse, collectionFinishedResponse, loading }
}

export function useQueueCallback(): (proposalId: string | undefined) => undefined | Promise<string> {
  const { account, chainId } = useWeb3React()
  const latestGovernanceContract = useGovernanceHubContract()
  const addTransaction = useTransactionAdder()

  return useCallback(
    (proposalId: string | undefined) => {
      if (!account || !latestGovernanceContract || !proposalId || !chainId) return
      const args = [proposalId]
      return latestGovernanceContract.estimateGas.queue(...args, {}).then((estimatedGasLimit) => {
        return latestGovernanceContract
          .queue(...args, { value: null, gasLimit: calculateGasMargin(estimatedGasLimit) })
          .then((response: TransactionResponse) => {
            addTransaction(response, {
              type: TransactionType.QUEUE,
              governorAddress: latestGovernanceContract.address,
              proposalId: parseInt(proposalId),
            })
            return response.hash
          })
      })
    },
    [account, addTransaction, latestGovernanceContract, chainId]
  )
}

export function useExecuteCallback(): (proposalId: string | undefined) => undefined | Promise<string> {
  const { account, chainId } = useWeb3React()
  const latestGovernanceContract = useGovernanceHubContract()
  const addTransaction = useTransactionAdder()

  return useCallback(
    (proposalId: string | undefined) => {
      if (!account || !latestGovernanceContract || !proposalId || !chainId) return
      const args = [proposalId]
      return latestGovernanceContract.estimateGas.execute(...args, {}).then((estimatedGasLimit) => {
        return latestGovernanceContract
          .execute(...args, { value: null, gasLimit: calculateGasMargin(estimatedGasLimit) })
          .then((response: TransactionResponse) => {
            addTransaction(response, {
              type: TransactionType.EXECUTE,
              governorAddress: latestGovernanceContract.address,
              proposalId: parseInt(proposalId),
            })
            return response.hash
          })
      })
    },
    [account, addTransaction, latestGovernanceContract, chainId]
  )
}

export function useCreateProposalCallback(): (
  createProposalData: CreateProposalData | undefined
) => undefined | Promise<string> {
  const { account, chainId } = useWeb3React()
  const latestGovernanceContract = useGovernanceHubContract()
  const addTransaction = useTransactionAdder()

  return useCallback(
    (createProposalData: CreateProposalData | undefined) => {
      if (!account || !latestGovernanceContract || !createProposalData || !chainId) return undefined

      const args = [
        createProposalData.targets,
        createProposalData.values,
        createProposalData.signatures,
        createProposalData.calldatas,
        createProposalData.description,
      ]

      return latestGovernanceContract.estimateGas.propose(...args).then((estimatedGasLimit) => {
        return latestGovernanceContract
          .propose(...args, { gasLimit: calculateGasMargin(estimatedGasLimit) })
          .then((response: TransactionResponse) => {
            addTransaction(response, {
              type: TransactionType.SUBMIT_PROPOSAL,
            })
            return response.hash
          })
      })
    },
    [account, addTransaction, latestGovernanceContract, chainId]
  )
}

export function useLatestProposalId(address: string | undefined): string | undefined {
  const latestGovernanceContract = useGovernanceHubContract()
  const res = useSingleCallResult(latestGovernanceContract, 'latestProposalIds', [address])
  return res?.result?.[0]?.toString()
}

export function useProposalThreshold(): CurrencyAmount<Token> | undefined {
  const { chainId } = useWeb3React()

  const latestGovernanceContract = useGovernanceHubContract()
  const res = useSingleCallResult(latestGovernanceContract, 'proposalThreshold')
  const uni = useMemo(() => (chainId ? UNI[chainId] : undefined), [chainId])

  if (res?.result?.[0] && uni) {
    return CurrencyAmount.fromRawAmount(uni, res.result[0])
  }

  return undefined
}
