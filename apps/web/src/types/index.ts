export interface IValidator {
    operator_address: string;
    consensus_pubkey: {
        "@type": string;
        key: string;
    };
    jailed: boolean;
    status: string;
    tokens: string;
    delegator_shares: string;
    description: {
        moniker: string;
        identity: string;
        website: string;
        security_contact: string;
        details: string;
    };
    unbonding_height: string;
    unbonding_time: string;
    commission: {
        commission_rates: {
            rate: string;
            max_rate: string;
            max_change_rate: string;
        };
        update_time: string;
    };
    min_self_delegation: string;
    unbonding_on_hold_ref_count: string;
    unbonding_ids: string[];
}

export interface Marker {
  latLng: [number, number]; // [latitude, longitude]
  name: string;
  value: number;
  style?: { fill: string };
}

export interface Coin {
  denom: string;
  amount: string;
}

export type TSignatures = {
    block_id_flag: string;
    validator_address: string;
    timestamp: string;
    signature: string;
}

export interface IBlock {
    header: {
        version: {
            block: string;
            app: string;
        };
        chain_id: string;
        height: string;
        time: string;
        last_block_id: {
            hash: string;
            part_set_header: {
                total: number;
                hash: string;
            };
        };
        last_commit_hash: string;
        data_hash: string;
        validators_hash: string;
        next_validators_hash: string;
        consensus_hash: string;
        app_hash: string;
        last_results_hash: string;
        evidence_hash: string;
        proposer_address: string;
    };
    data: {
        txs: string[];
    };
    last_commit: {
        height: string;
        round: number;
        block_id: {
           hash: string;
           part_set_header: {
            total: number;
            hash: string;
           }
        };
        signatures: TSignatures[];
    }
}

export interface IProposal {
    id: string;
    messages: TMessage[];
    status: string;
    final_tally_result: {
        yes_count: string;
        abstain_count: string;
        no_count: string;
        no_with_veto_count: string;
    }
    submit_time: string;
    deposit_end_time: string;
    total_deposit: Coin[];
    voting_start_time: string;
    voting_end_time: string;
    metadata: string;
    title: string;
    summary: string;
    proposer: string;
    expedited: boolean;
    failed_reason: string;
}

export type TVoteOption = {
    option: string;
    weight: string;
}

export interface IVote {
   proposal_id: string;
   voter: string;
   option: string;
   options: TVoteOption[];
}

export type TSigningInfos = {
  address: string;
  index_offset: string;
  jailed_until: string;
  missed_blocks_counter: string;
  start_height: string;
  tombstoned: boolean;
}

export type IReward = {
  validator_address: string;
  reward: Coin[];
}

type TEntry = {
  creation_height: string;
  completion_time: string;
  initial_balance: string;
  balance: string;
  unbonding_id: string;
  unbonding_on_hold_ref_count: string;
}

export type TUnbondingDelegation = {
  delegator_address: string;
  validator_address: string;
  entries: TEntry[];
}

interface DelegationResponse {
  delegation: {
    delegator_address: string;
    validator_address: string;
    shares: string;
  };
  balance: Coin
}

interface ValidatorRewards {
  validator_address: string;
  reward: Coin[];
}

export interface AccountInfoData {
  balances: Coin[];
  delegations: DelegationResponse[];
  rewards: ValidatorRewards[];
}

export type TMessage = {
    '@type': string;
    delegator_address: string;
    validator_address: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    amount: any;
}

export type TOption = {
    '@type': string;
}

export type TSignerInfos = {
    public_key: {
        '@type': string;
        key: string;
    };
    mode_info: {
        single: {
            mode: string;
        };
    };
    sequence: string;
}

export type TAttribute = {
    key: string;
    value: string;
    index: boolean;
}

export type TFee = {
    amount: Coin[];
    gas_limit: string;
    payer: string;
    granter: string;
}

type TEvent = {
    type: string;
    attributes: TAttribute[];
}

type TEventAttribute = {
    key: string;
    value: string;
}

export type TLogEvent = {
    attributes: TEventAttribute[];
    type: string;
}

export type TLog = {
    events: TLogEvent[];
    log: string;
    msg_index: number;
}

export interface IRecentActivity {
    code: number;
    codespace: string;
    height: string;
    txhash: string;
    data: string;
    raw_log: string;
    info: string;
    logs: TLog[];
    gas_wanted: string;
    gas_used: string;
    timestamp: string;
    events: TEvent[];
    tx: {
        '@type': string;
        body: {
            messages: TMessage[],
            memo: string;
            timeout_height: string;
            extension_options: TOption[];
            non_critical_extension_options: TOption[];
        },
        auth_info: {
            signer_infos: TSignerInfos[];
            fee: TFee;
            tip: {
                amount: Coin[],
                tipper: string
            }
        };
        signatures: string;
    };
}

export type ViewId =
  | "dashboard"
  | "staking"
  | "governance"
  | "cascade"
  | "sense"
  | "inference"
  | "nfts"
  | "wallet"
  | "block"
