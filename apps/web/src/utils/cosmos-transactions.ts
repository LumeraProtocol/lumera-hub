export const GOVERNANCE_TRANSACTION_UNAVAILABLE_MESSAGE =
  'Governance transactions are temporarily unavailable with MetaMask on this network.';

export const canWalletSignCosmosTransactions = ({
  isEvmNetwork,
  chainEip712Enabled,
  hasEvmCosmosSigner,
}: {
  isEvmNetwork: boolean;
  chainEip712Enabled: boolean;
  hasEvmCosmosSigner: boolean;
}) => !isEvmNetwork || (chainEip712Enabled && hasEvmCosmosSigner);

export const assertGovernanceTransactionsAvailable = (canSignCosmosTransactions: boolean) => {
  if (!canSignCosmosTransactions) {
    throw new Error(GOVERNANCE_TRANSACTION_UNAVAILABLE_MESSAGE);
  }
};
