import { describe, expect, it } from 'vitest';

import { describeFailure } from '@lumera-hub/ui/src/hub/Drawer';
import { timedOutTxId } from './TxDrawer';

/*
 * What a failed transaction tells the reader it cost. Only a transaction that
 * reached a block was charged; claiming a fee for one the network refused at
 * the door (the testnet "pubKey does not match signer address" rejection) was
 * wrong and alarming.
 */
describe('describeFailure', () => {
  it('charges a fee only once the transaction reached a block', () => {
    expect(describeFailure({ blockHeight: '6847304' }).body).toMatch(/block 6847304.*fee was still charged/);
    expect(describeFailure({ txHash: 'ABC' }).body).toMatch(/fee was still charged/);
  });

  it('says no fee when the network refused it before any block', () => {
    const failure = describeFailure({
      errorDetail:
        'Broadcasting transaction failed with code 8 (codespace: sdk). Log: pubKey does not match signer address lumera18ulqt4jzn5ch3h4yt8xn9rd9wuufvftxu237hj with signer index: 0: invalid pubkey',
    });
    expect(failure.title).toBe('Rejected by the network');
    expect(failure.body).toMatch(/not charged a fee/);
  });

  it('does not promise anything about a transaction that may still land', () => {
    const failure = describeFailure({
      errorDetail: 'Transaction with ID ABC was submitted but was not yet found on the chain.',
    });
    expect(failure.title).toBe('Not confirmed yet');
    expect(failure.body).not.toMatch(/fee/);
  });

  it('treats a failure before broadcast as nothing sent', () => {
    expect(describeFailure({ errorDetail: 'No RPC host answered for signing.' })).toMatchObject({
      title: 'Not sent',
      body: expect.stringMatching(/not charged a fee/),
    });
    expect(describeFailure({ errorDetail: 'Query failed with (6): insufficient funds' }).title).toBe('Not sent');
  });

  it('makes no promise about an error that may have come after the broadcast', () => {
    // CosmJS broadcasts, then polls for the block; a dropped poll is a plain error
    // even though the transaction may already be in the next block.
    const failure = describeFailure({ errorDetail: 'Bad status on response: 429' });
    expect(failure.title).toBe('Status unknown');
    expect(failure.body).not.toMatch(/not charged|no fee/i);
  });
});

describe('timedOutTxId', () => {
  it('recovers the id of a transaction CosmJS stopped waiting for', () => {
    const id = 'A'.repeat(64);
    expect(
      timedOutTxId(
        `Transaction with ID ${id} was submitted but was not yet found on the chain. You might want to check later. There was a wait of 60 seconds.`,
      ),
    ).toBe(id);
    expect(timedOutTxId('Broadcasting transaction failed with code 8')).toBeUndefined();
  });
});
