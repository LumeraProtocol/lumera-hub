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
  validator_src_address?: string;
  validator_dst_address?: string;
  type: string;
  entries: TEntry[];
  completion_time?: string;
}

export interface DelegationResponse {
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
    metadata?: string;
    price?: string;
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
  | "user"
  | "tracking"

export interface IFullBlock {
  block: IBlock;
  block_id: {
    hash: string;
    part_set_header: {
      hash: string;
      total: number;
    };
  };
}


interface ITransaction {
  action_price: string;
  action_price_denom: string;
  block_time: string;
  flow_payee: string;
  flow_payer: string;
  gas_used: number;
  gas_wanted: number;
  height: number;
  tx_fee: string;
  tx_fee_denom: string;
  tx_hash: string;
  tx_type: string;
}

export interface IActionDetail {
  block_height: number;
  creator: string;
  decoded: {
    data_hash: string;
    file_name: string;
    public: boolean;
    rq_ids_ic: number;
    rq_ids_ids: string[];
    rq_ids_max: number;
    signatures: string;
  };
  finalize_tx_id: string;
  finalize_tx_time: string;
  id: string;
  mime_type: string;
  price: {
    amount: string;
    denom: string;
  };
  register_tx_id: string;
  register_tx_time: string;
  schema_version: string;
  size: number;
  state: string;
  super_nodes: string[];
  timestamp: string;
  transactions: ITransaction[];
  type: string;
}

export const VIEW_TITLES: Record<ViewId, string> = {
  dashboard: "Dashboard",
  staking: "Staking",
  governance: "Governance",
  cascade: "Cascade",
  sense: "Sense",
  inference: "Inference",
  nfts: "NFTs",
  wallet: "Wallet",
  block: "Block Details",
  user: 'Users',
  tracking: "Active Hub Users",
}

export type TFromMessage = {
  [key: string]: string;
}

export type TSupernode = {
  supernode_account: string;
  validator_address: string;
  validator_moniker: string;
  current_state: string;
  ip_address: string;
  p2p_port: number;
  protocol_version: string;
  actual_version: string;
  cpu_usage_percent: number;
  cpu_cores: number;
  memory_total_gb: number;
  memory_used_gb: number;
  memory_usage_percent: number;
  storage_total_bytes: number;
  storage_used_bytes: number;
  storage_usage_percent: number;
  hardware_summary: string;
  peers_count: number;
  uptime_seconds: number;
  rank: number;
  p2p_db_size_mb: number;
  p2p_records: number;
  last_status_check: string;
  is_status_api_available: boolean;
  metrics_report: {
    ports: {
      p2p: boolean;
      p2pPort: number;
      port1: boolean;
      port1Num: number;
    },
    status: {
      Available: boolean;
      CPUCores: number;
      CPUUsagePercent: number;
      HardwareSummary: string;
      MemoryTotalGb: number;
      MemoryUsagePercent: number;
      MemoryUsedGb: number;
      P2PDbSizeMb: number;
      P2PRecords: number;
      PeersCount: number;
      Rank: number;
      StorageTotalBytes: number;
      StorageUsagePercent: number;
      StorageUsedBytes: number;
      UptimeSeconds: number;
      Version: string;
    }
  },
  schema_version: string;
  last_successful_probe: string;
  failed_probe_counter: number;
  last_known_actual_version: string;
}

export type TSupernodesStats = {
  total_cpu_cores: number;
  total_memory_gb: number;
  total_storage_bytes: number;
  used_storage_bytes: number;
  available_storage_bytes: number;
  storage_used_percent: number;
  storage_available_percent: number;
  total_p2p_db_size_mb: number;
  total_p2p_records: number;
  available_supernodes: number;
  schema_version: string;
}

export type TPoolState = {
  balance: Coin[];
  last_distribution_height: string;
  eligible_sn_count: string;
}

export type TSupernodeAccount = {
  "@type": string;
  base_account: {
    address: string;
    pub_key: string | null;
    account_number: string;
    sequence: string;
  };
  name: string;
  permissions: string[];
}

export type TVersion = {
  version: string;
  nodes_total: number;
  nodes_available: number;
  nodes_unavailable: number;
  is_latest: number;
}

export type TMatrix = {
  latest_version: string;
  versions: TVersion[];
}

export type TActionsStats = {
  total: number;
  states: {
    ACTION_STATE_DONE: number;
    ACTION_STATE_EXPIRED: number;
    ACTION_STATE_PENDING: number;
    ACTION_STATE_APPROVED: number;
  };
}

export type TRefer = {
  lumeraAddress: string;
  referAddress: string;
  created_at: string;
}
