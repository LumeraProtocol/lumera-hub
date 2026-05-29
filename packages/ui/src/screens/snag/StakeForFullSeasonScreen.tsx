import {
  Card,
  Input,
  Label,
} from 'tamagui';

import { AppLoading } from '@/components/Loading';
import AppButton from '@/components/AppButton';

interface IStakeForFullSeasonScreen {
  isLoading: boolean;
  address: string;
  message: {
    type: string;
    content: string;
  };
  onVerifyClick: () => void;
  onChangeText: (val: string) => void;
}

export const StakeForFullSeasonScreen = ({
  isLoading,
  address,
  message,
  onVerifyClick,
  onChangeText,
}: IStakeForFullSeasonScreen) => {
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
            <div className='p-5 min-w-[80vw] sm:min-w-xl'>
              <div>
                <Label htmlFor="address" className='!text-base !font-bold'>Submit your address!</Label>
                <div className='input-wrapper mt-2'>
                  <Input
                    id="address"
                    placeholder="Enter some text here..."
                    className='input'
                    value={address}
                    onChangeText={onChangeText}
                  />
                </div>
              </div>
              {message.type === 'error' ?
                <div className='text-red-500 w-full mt-3'>
                  <span>{message.content}</span>
                </div> : null
              }
              {message.type === 'success' ?
                <div className='text-lumera-teal w-full mt-3'>
                  <span>{message.content}</span>
                </div> : null
              }
              <div className='mt-3 flex justify-end'>
                <AppButton
                  className='disabled:opacity-45'
                  disabled={!address || isLoading}
                  onClick={onVerifyClick}
                >
                  <span>Claim</span>
                </AppButton>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
