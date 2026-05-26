import {
  Card,
  Input,
  Label,
} from 'tamagui';
import {
  CopyIcon
} from 'lucide-react';

import { AppLoading } from '@/components/Loading';

interface IReferralLinkScreen {
  isLoading: boolean;
  referLink: string;
  onCopyReferLink: (link: string) => void;
}

export const ReferralLinkScreen = ({
  referLink,
  isLoading,
  onCopyReferLink,
}: IReferralLinkScreen) => {
  return (
    <div className='w-screen h-screen flex items-center justify-center'>
      <div className="relative p-3 min-w-2xl">
        <div className='flex items-center justify-center w-full'>
          <Card elevate size="$4" bordered className='relative'>
            <AppLoading
              isLoading={isLoading}
              className="w-10 h-10 !border-2"
              iconWidth={20}
              iconHeight={20}
              containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
            />
            <div className='p-5 min-w-[80vw] sm:min-w-xl max-w-xl'>
              <div className='text-2xl font-bold text-center'>
                Earn rewards when a new user signs up with your referral link:
              </div>
              <div className='mt-3'>
                <Label htmlFor="txHash" className='!text-base'>Referral Link</Label>
                <div className='input-wrapper mt-2 flex gap-2 items-center justify-between'>
                  <Input
                    id="txHash"
                    placeholder="Referral link"
                    className='input'
                    defaultValue={referLink}
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => onCopyReferLink(referLink)}
                    className='border-[1px] rounded-full p-2 border-lumera-label cursor-pointer'
                  >
                    <CopyIcon className='w-4 h-4 text-lumera-label' />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
