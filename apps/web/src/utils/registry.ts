import { Registry } from "@cosmjs/proto-signing";

import { MsgWithdrawDelegatorReward } from 'cosmjs-types/cosmos/distribution/v1beta1/tx';
import { MsgDelegate, MsgBeginRedelegate, MsgUndelegate } from 'cosmjs-types/cosmos/staking/v1beta1/tx';
import { MsgDeposit, MsgVote } from 'cosmjs-types/cosmos/gov/v1/tx';
import { MsgSend } from 'cosmjs-types/cosmos/bank/v1beta1/tx';

export const globalRegistry = new Registry([
  ["/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward", MsgWithdrawDelegatorReward],
  ["/cosmos.staking.v1beta1.MsgDelegate", MsgDelegate],
  ["/cosmos.gov.v1.MsgDeposit", MsgDeposit],
  ["/cosmos.gov.v1.MsgVote", MsgVote],
  ["/cosmos.staking.v1beta1.MsgBeginRedelegate", MsgBeginRedelegate],
  ["/cosmos.bank.v1beta1.MsgSend", MsgSend],
  ["/cosmos.staking.v1beta1.MsgUndelegate", MsgUndelegate],
])
