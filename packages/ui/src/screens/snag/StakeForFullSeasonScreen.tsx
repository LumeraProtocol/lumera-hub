import {
  Card,
  Input,
  Label,
} from 'tamagui';

import { AppLoading } from '@/components/Loading';
import AppButton from '@/components/AppButton';
import SectionTitle from '@/components/SectionTitle';
import Recaptcha from '@/components/Recaptcha';
import { IQuest } from '@/hooks/useSnagTextInput';

interface IStakeForFullSeasonScreen {
  isLoading: boolean;
  address: string;
  message: {
    type: string;
    content: string;
  };
  quest: IQuest | null;
  isVerified: boolean;
  onVerifyClick: () => void;
  onChangeText: (val: string) => void;
  oneRecaptchaChange: (value: string | null) => void;
}

export const StakeForFullSeasonScreen = ({
  isLoading,
  address,
  message,
  quest,
  isVerified,
  onVerifyClick,
  onChangeText,
  oneRecaptchaChange,
}: IStakeForFullSeasonScreen) => {
  return (
    <div className='flex items-center justify-center'>
      <Card elevate size="$4" bordered className='w-full relative'>
        <AppLoading
          isLoading={isLoading}
          className="w-10 h-10 !border-2"
          iconWidth={20}
          iconHeight={20}
          containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
        />
        <div className='p-5'>
          <SectionTitle className='mb-2'>
            {quest?.name}
          </SectionTitle>
          <div className='text-lumera-label'>{quest?.description}</div>
          <div className='mt-3'>
            <Label htmlFor="address" className='!text-base !font-bold'>Submit your address!</Label>
            <div className='input-wrapper mt-1'>
              <Input
                id="address"
                placeholder="Enter some text here..."
                className='input'
                value={address}
                onChangeText={onChangeText}
              />
            </div>
          </div>
          <div className="mt-3">
            <Recaptcha onChange={oneRecaptchaChange} />
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
              disabled={!address || isLoading || !isVerified}
              onClick={onVerifyClick}
            >
              <span>Claim</span>
            </AppButton>
          </div>
        </div>
      </Card>
    </div>
  );
}
