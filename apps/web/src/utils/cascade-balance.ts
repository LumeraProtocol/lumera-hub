import { DENOM } from '@/contants/network'
import * as instance from '@/utils/api'
import { evmBalanceToMicroLume, getEvmBalance } from '@/utils/evm'

interface BalanceResponse {
  data?: {
    balances?: Array<{
      amount: string
      denom: string
    }>
  }
}

interface CascadeBalanceOptions {
  address: string
  isEvm: boolean
  getCosmosBalances?: (path: string) => Promise<BalanceResponse>
  getEvmAccountBalance?: (address: string) => Promise<string>
}

export const getCascadeBalanceMicroLume = async ({
  address,
  isEvm,
  getCosmosBalances = instance.get,
  getEvmAccountBalance = getEvmBalance,
}: CascadeBalanceOptions): Promise<number> => {
  if (isEvm) {
    const balance = await getEvmAccountBalance(address)
    return Number(evmBalanceToMicroLume(balance))
  }

  const { data } = await getCosmosBalances(
    `/cosmos/bank/v1beta1/balances/${address}`,
  )
  return (data?.balances ?? []).reduce(
    (total, balance) =>
      balance.denom === DENOM ? total + Number(balance.amount) : total,
    0,
  )
}
