import {
  Card,
  Input,
  Label,
  H2,
} from 'tamagui';
import {
  CopyIcon
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { AppLoading } from '@/components/Loading';
import SectionTitle from '@/components/SectionTitle';
import AppButton from '@/components/AppButton';
import { TRefer } from '@/types';
import { formatAddress } from '@/utils/format';

dayjs.extend(relativeTime);

interface IReferralLinkScreen {
  isLoading: boolean;
  referLink: string;
  customTitle: string;
  point?: string;
  totalReferralLink?: string;
  refers: TRefer[];
  onCopyReferLink: (link: string) => void;
}

export const ReferralLinkScreen = ({
  referLink,
  isLoading,
  customTitle,
  totalReferralLink = '10',
  point = '50 EXP',
  refers,
  onCopyReferLink,
}: IReferralLinkScreen) => {
  return (
    <div className='w-full relative'>
      <AppLoading
        isLoading={isLoading}
        className="w-10 h-10 !border-2"
        iconWidth={20}
        iconHeight={20}
        containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
      />
      <H2 className='!font-bold text-white !text-2xl sm:!text-[32px] !leading-[1.2]'>
        {customTitle || `Earn ${point} for every signed up ${totalReferralLink} friends`}
      </H2>
      <Card elevate size="$4" bordered className='relative !mt-6'>
        <div className='p-5'>
          <SectionTitle className='!mb-0'>
           Share your referral link
          </SectionTitle>
          <div className='mt-3'>
            <Label htmlFor="txHash" className='!text-base'>Referral Link</Label>
            <div className='input-wrapper mt-2 flex gap-2 items-center justify-between'>
              <Input
                id="txHash"
                placeholder="Referral link"
                className='input'
                value={referLink}
                readOnly
              />
              <AppButton
                className='disabled:opacity-45 whitespace-nowrap'
                onClick={() => onCopyReferLink(referLink)}
              >
                <CopyIcon className='w-4 h-4' /> <span className="hidden sm:inline-block">Copy link</span>
              </AppButton>
            </div>
          </div>
        </div>
      </Card>
      <Card elevate size="$4" bordered className='relative !mt-6'>
        <div className='p-5'>
          <SectionTitle className='!mb-0'>
           How it works
          </SectionTitle>
          <div className='mt-3 grid grid-cols-1 md:grid-cols-3 gap-5'>
            <Card elevate size="$4" bordered className='w-full'>
              <Card.Header padded>
                <div>
                  <span className='rounded-full h-9 w-9 bg-lumera-teal text-white inline-flex items-center justify-center text-base font-bold leading-none'>1</span>
                </div>
                <h3 className='text-xl font-bold text-lumera-teal mt-2'>Send invite</h3>
                <div className='mt-2'>
                  Send your referral link to friends and tell them how to create a Lumera address.
                </div>
              </Card.Header>
            </Card>
            <Card elevate size="$4" bordered className='w-full'>
              <Card.Header padded>
                <div>
                  <span className='rounded-full h-9 w-9 bg-lumera-teal text-white inline-flex items-center justify-center text-base font-bold leading-none'>2</span>
                </div>
                <h3 className='text-xl font-bold text-lumera-teal mt-2'>Connect to Lumera Hub</h3>
                <div className='mt-2'>
                  Let them connect their wallet to Lumera Hub using your referral link.
                </div>
              </Card.Header>
            </Card>
            <Card elevate size="$4" bordered className='w-full'>
              <Card.Header padded>
                <div>
                  <span className='rounded-full h-9 w-9 bg-lumera-teal text-white inline-flex items-center justify-center text-base font-bold leading-none'>3</span>
                </div>
                <h3 className='text-xl font-bold text-lumera-teal mt-2'>Get your reward</h3>
                <div className='mt-2'>
                  You get {point} EXP
                </div>
              </Card.Header>
            </Card>
          </div>
        </div>
      </Card>
      {refers?.length ?
        <Card elevate size="$4" bordered className='relative !mt-6'>
          <div className='p-5'>
            <SectionTitle className='!mb-0'>
              My Referrals
            </SectionTitle>
            <div className='mt-3'>
              <div className="md:overflow-x-auto">
                <table className="table w-full md:min-w-[550px]">
                  <thead className='hidden md:table-header-group'>
                    <tr className='text-sm'>
                      <th align='left' className='!py-2 !px-3'>Address</th>
                      <th align='left' className='!py-2 !px-3'>Created at</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {refers.map((refer, index) => (
                      <tr key={refer.lumeraAddress} className={`${index % 2 === 0 ? '!bg-gray-900' : ''} flex flex-col gap-1 md:table-row`}>
                        <td className='!py-2 !px-3'>
                          <div className="md:hidden font-semibold text-gray-500 mr-2">Address: </div>
                          <span className='truncate hidden sm:inline-block'>{refer.lumeraAddress}</span>
                          <span className='block sm:hidden'>{formatAddress(refer.lumeraAddress, 12, -6)}</span>
                        </td>
                        <td className='!py-2 !px-3'>
                          <div className="md:hidden font-semibold text-gray-500 mr-2">Created at: </div>
                          <span className='break-words'>{dayjs(refer.created_at).format('MMMM DD, YYYY')} at {dayjs(refer.created_at).format('HH:mm:ss')}({dayjs(refer.created_at).fromNow()})</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Card> : null
      }
    </div>
  );
}
