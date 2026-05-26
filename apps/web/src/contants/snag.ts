
export const LOYALTY_RULE_TYPE = [
  {
    value: 'external_rule',
    label: 'External rule',
  }
];

export const FREQUENCE = [
  {
    value: 'once',
    label: 'One time',
  },
  {
    value: 'hourly',
    label: 'Hourly',
  },
  {
    value: 'daily',
    label: 'Daily',
  },
  {
    value: 'weekly',
    label: 'Weekly',
  },
  {
    value: 'monthly',
    label: 'Monthly',
  },
];

export const NETWORK = [
  {
    value: '',
    label: 'N/A',
  },
  {
    value: 'mainnet',
    label: 'Mainnet',
  },
  {
    value: 'testnet',
    label: 'Testnet',
  },
];

export const TRANSACTION_TYPE = [
  {
    value: '',
    label: 'N/A',
  },
  {
    value: 'weekly',
    label: 'Weekly',
  },
  {
    value: 'lifetime ',
    label: 'Lifetime ',
  },
];

export const CONDITION = [
  {
    value: '>=',
    label: '>=',
  },
  {
    value: '>',
    label: '>',
  },
  // {
  //   value: '<=',
  //   label: '<=',
  // },
  // {
  //   value: '<',
  //   label: '<',
  // },
  {
    value: '=',
    label: '=',
  },
];

export const CONDITION_EXTEND = [
  {
    value: '>=',
    label: '>=',
  },
  // {
  //   value: '>',
  //   label: '>',
  // },
];

export const UPLOAD_CASCADE = [
  {
    value: 'files',
    label: 'Files',
  },
  {
    value: 'types',
    label: 'Types',
  },
  {
    value: 'size',
    label: 'Size',
  },
  {
    value: 'store',
    label: 'Store',
  },
  {
    value: 'totalStored',
    label: 'Total stored',
  },
  {
    value: 'firstUploaded',
    label: 'First uploaded',
  },
];

export const URL_CHECK = {
  mainnet: {
    domain: 'https://hub.lumera.io/',
    urlCheck: {
      staked: 'https://lcd.lumera.io/cosmos/tx/v1beta1/txs/',
      delegate: 'https://lcd.lumera.io/cosmos/tx/v1beta1/txs/',
      redelegated: 'https://lcd.lumera.io/cosmos/tx/v1beta1/txs/',
      balance: 'https://lcd.lumera.io/cosmos/bank/v1beta1/balances/',
      supernode: 'https://snscope.lumera.io/v1/supernodes/metrics?status=any&minFailedProbeCounter=0&limit=200',
      supernodeValidator: 'https://lcd.lumera.io/cosmos/staking/v1beta1/validators?pagination.limit=1000',
      claim: 'https://lcd.lumera.io/cosmos/tx/v1beta1/txs/',
      send: 'https://lcd.lumera.io/cosmos/tx/v1beta1/txs/',
      sendTransactions: 'https://lcd.testnet.lumera.io/cosmos/tx/v1beta1/txs?query=message.sender=%27{walletAddress}%27&pagination.limit=20&pagination.offset=0&order_by=ORDER_BY_DESC',
      interactModules: 'https://lcd.testnet.lumera.io/cosmos/tx/v1beta1/txs?query=message.sender=%27{walletAddress}%27&pagination.limit=20&pagination.offset=0&order_by=ORDER_BY_DESC',
      firstTimeDelegation: 'https://lcd.lumera.io/cosmos/tx/v1beta1/txs/',
      stakeLUME: 'https://lcd.lumera.io/cosmos/staking/v1beta1/delegations/',
      decentralizationStake: 'https://lcd.lumera.io/cosmos/staking/v1beta1/delegations/',
      claimRewards: 'https://lcd.lumera.io/cosmos/tx/v1beta1/txs/',
      compoundRewards: 'https://lcd.lumera.io/cosmos/tx/v1beta1/txs/',
      firstUploadCascade: 'https://lcd.lumera.io/cosmos/tx/v1beta1/txs/',
      uploadedToCascade: 'https://snscope.lumera.io/v1/actions?type=ACTION_TYPE_CASCADE&creator=',
      slashingParams: 'https://lcd.lumera.io/cosmos/slashing/v1beta1/params',
      signingInfos: 'https://lcd.lumera.io/cosmos/slashing/v1beta1/signing_infos?pagination.limit=300',
      storageRequests: 'https://snscope.lumera.io/v1/actions?supernode={supernodeAddress}&limit={itemPerPage}&include_transactions=true',
    }
  },
  testnet: {
    domain: 'https://hub.lumera.io/',
    urlCheck: {
      staked: 'https://lcd.testnet.lumera.io/cosmos/tx/v1beta1/txs/',
      delegate: 'https://lcd.testnet.lumera.io/cosmos/tx/v1beta1/txs/',
      redelegated: 'https://lcd.testnet.lumera.io/cosmos/tx/v1beta1/txs/',
      balance: 'https://lcd.testnet.lumera.io/cosmos/bank/v1beta1/balances/',
      supernode: 'https://snscope.testnet.lumera.io/v1/supernodes/metrics?status=any&minFailedProbeCounter=0&limit=200',
      supernodeValidator: 'https://lcd.testnet.lumera.io/cosmos/staking/v1beta1/validators?pagination.limit=1000',
      claim: 'https://lcd.testnet.lumera.io/cosmos/tx/v1beta1/txs/',
      send: 'https://lcd.testnet.lumera.io/cosmos/tx/v1beta1/txs/',
      sendTransactions: 'https://lcd.lumera.io/cosmos/tx/v1beta1/txs?query=message.sender=%27{walletAddress}%27&pagination.limit=20&pagination.offset=0&order_by=ORDER_BY_DESC',
      interactModules: 'https://lcd.lumera.io/cosmos/tx/v1beta1/txs?query=message.sender=%27{walletAddress}%27&pagination.limit=20&pagination.offset=0&order_by=ORDER_BY_DESC',
      firstTimeDelegation: 'https://lcd.testnet.lumera.io/cosmos/tx/v1beta1/txs/',
      stakeLUME: 'https://lcd.testnet.lumera.io/cosmos/staking/v1beta1/delegations/',
      decentralizationStake: 'https://lcd.testnet.lumera.io/cosmos/staking/v1beta1/delegations/',
      ClaimRewards: 'https://lcd.testnet.lumera.io/cosmos/tx/v1beta1/txs/',
      compoundRewards: 'https://lcd.testnet.lumera.io/cosmos/tx/v1beta1/txs/',
      firstUploadCascade: 'https://lcd.testnet.lumera.io/cosmos/tx/v1beta1/txs/',
      uploadedToCascade: 'https://snscope.testnet.lumera.io/v1/actions?type=ACTION_TYPE_CASCADE&creator=',
      slashingParams: 'https://lcd.testnet.lumera.io/cosmos/slashing/v1beta1/params',
      signingInfos: 'https://lcd.testnet.lumera.io/cosmos/slashing/v1beta1/signing_infos?pagination.limit=300',
      storageRequests: 'https://snscope.testnet.lumera.io/v1/actions?supernode={supernodeAddress}&limit={itemPerPage}&include_transactions=true',
    }
  }
}

export const ACTION_TYPE = [
  {
    value: '',
    label: 'N/A',
  },
  {
    value: 'staked',
    label: 'Staked',
  },
  {
    value: 'delegate',
    label: 'Delegate tokens',
  },
  {
    value: 'redelegated',
    label: 'Redelegated',
  },
  {
    value: 'balance',
    label: 'Check balance',
  },
  {
    value: 'supernode',
    label: 'Supernode',
  },
  {
    value: 'claim',
    label: 'Claim tokens',
  },
  {
    value: 'send',
    label: 'Send A Transaction',
  },
  {
    value: 'sendTransactions',
    label: 'Send Transactions',
  },
  {
    value: 'stakeLUME',
    label: 'Stake LUME',
  },
  {
    value: 'interactModules',
    label: 'Interact modules',
  },
  {
    value: 'firstTimeDelegation',
    label: 'First-time delegation',
  },
  {
    value: 'decentralizationStake',
    label: 'Decentralization Stake',
  },
  {
    value: 'claimRewards',
    label: 'Claim staking rewards',
  },
  {
    value: 'compoundRewards',
    label: 'Compound rewards',
  },
  {
    value: 'firstUploadCascade',
    label: 'First upload to Cascade',
  },
  {
    value: 'uploadedToCascade',
    label: 'Cascade',
  },
  {
    value: 'uptime',
    label: 'Uptime this week',
  },
  {
    value: 'storageRequests',
    label: 'Storage requests',
  },
];
