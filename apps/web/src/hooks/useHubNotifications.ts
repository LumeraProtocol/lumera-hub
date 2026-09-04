import { useMemo } from 'react';

import useAccountInfo from '@/hooks/useAccountInfo';
import useGovernances from '@/hooks/useGovernances';
import useChainParams from '@/hooks/useChainParams';
import { RATE_VALUE } from '@/contants';
import { DENOM } from '@/contants/network';
import { formatNumber } from '@/utils/format';
import { getRewards } from '@/utils/portfolio';

const TOKEN = DENOM.replace(/^u/, '').toUpperCase();

export type HubNotification = {
  id: string;
  kind: 'Staking' | 'Governance' | 'Network';
  tone: 'green' | 'warn' | 'danger' | 'muted';
  title: string;
  body: string;
  when: string;
  cta: string;
  href: string;
};

/**
 * Notifications derived from live chain state rather than a fixed list.
 *
 * Three things are worth interrupting someone for: rewards sitting unclaimed,
 * a proposal closing while they hold voting weight, and an unbonding that is
 * about to land. All three are computed from what the chain currently says, so
 * there is nothing to go stale.
 */
const useHubNotifications = (address?: string) => {
  const { accountInfo } = useAccountInfo(address ? { address } : {});
  const { governances } = useGovernances();
  const { params } = useChainParams();

  return useMemo(() => {
    const items: HubNotification[] = [];
    if (!address) return items;

    const rewards = getRewards(accountInfo);
    if (rewards > 0) {
      const validators = accountInfo?.rewards?.length || 0;
      items.push({
        id: 'rewards',
        kind: 'Staking',
        tone: 'green',
        title: `${formatNumber(rewards / RATE_VALUE, { decimalsLength: 2, currency: 'en-US' })} ${TOKEN} in rewards ready`,
        body: `Unclaimed across ${validators} validator${validators === 1 ? '' : 's'}. Claiming does not touch your bonded stake.`,
        when: 'now',
        cta: 'Claim',
        href: '/',
      });
    }

    // Only worth surfacing a vote to someone whose stake gives it weight.
    const staked = (accountInfo?.delegations || []).reduce(
      (sum, d) => sum + (Number(d.balance.amount) || 0),
      0,
    );
    (governances || [])
      .filter((p) => p.status === 'PROPOSAL_STATUS_VOTING_PERIOD')
      .forEach((p) => {
        const closes = p.voting_end_time ? new Date(p.voting_end_time) : null;
        const hoursLeft = closes
          ? Math.max(0, Math.round((closes.getTime() - Date.now()) / 3600000))
          : null;
        items.push({
          id: `gov-${p.id}`,
          kind: 'Governance',
          tone: hoursLeft != null && hoursLeft < 48 ? 'warn' : 'muted',
          title: `#${p.id} ${hoursLeft != null ? `closes in ${hoursLeft < 48 ? `${hoursLeft}h` : `${Math.round(hoursLeft / 24)}d`}` : 'is open for voting'}`,
          body: staked
            ? `${p.title}. Your bonded stake carries weight on this vote.`
            : `${p.title}. Voting weight comes from bonded stake.`,
          when: closes ? closes.toLocaleDateString() : '',
          cta: 'Read proposal',
          href: `/governance/${p.id}`,
        });
      });

    (accountInfo?.unbonding || []).forEach((u, ui) => {
      u.entries.forEach((entry, ei) => {
        const completes = entry.completion_time ? new Date(entry.completion_time) : null;
        if (!completes) return;
        const daysLeft = Math.ceil((completes.getTime() - Date.now()) / 86400000);
        items.push({
          id: `unbond-${ui}-${ei}`,
          kind: 'Staking',
          tone: daysLeft <= 1 ? 'green' : 'muted',
          title:
            daysLeft <= 0
              ? `${formatNumber(Number(entry.balance) / RATE_VALUE, { decimalsLength: 2, currency: 'en-US' })} ${TOKEN} has finished unbonding`
              : `${formatNumber(Number(entry.balance) / RATE_VALUE, { decimalsLength: 2, currency: 'en-US' })} ${TOKEN} unbonds in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
          body:
            daysLeft <= 0
              ? 'It has returned to your liquid balance.'
              : `Earning nothing until ${completes.toLocaleDateString()}. Redelegating instead would have kept it earning.`,
          when: completes.toLocaleDateString(),
          cta: 'Open wallet',
          href: '/wallet',
        });
      });
    });

    return items;
  }, [accountInfo, address, governances, params]);
};

export default useHubNotifications;
