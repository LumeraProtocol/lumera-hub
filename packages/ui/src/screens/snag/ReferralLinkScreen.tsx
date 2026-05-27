import {
  Card,
  Input,
  Label,
  H2,
} from 'tamagui';
import {
  CopyIcon
} from 'lucide-react';

import { AppLoading } from '@/components/Loading';
import SectionTitle from '@/components/SectionTitle';
import AppButton from '@/components/AppButton';

interface IReferralLinkScreen {
  isLoading: boolean;
  referLink: string;
  customTitle: string;
  point?: string;
  totalReferralLink?: string;
  onCopyReferLink: (link: string) => void;
}

export const ReferralLinkScreen = ({
  referLink,
  isLoading,
  customTitle,
  totalReferralLink = '10',
  point = '50 EXP',
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
    </div>
  );
}
