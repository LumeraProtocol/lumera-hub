import {
  Card,
  Input,
  Label,
} from 'tamagui';

import { AppLoading } from '@/components/Loading';
import AppButton from '@/components/AppButton';
import SectionTitle from '@/components/SectionTitle';
import { ConnectButton } from '@/components/ConnectWallet';

interface ILoginScreen {
  isLoading: boolean;
  message: {
    type: string;
    content: string;
  };
  fornContent: {
    email: string;
    password: string;
  };
  onInputChange: (name: string, val: string) => void;
  onLoginButtonClick: () => void;
}

export const LoginScreen = ({
  isLoading,
  message,
  fornContent,
  onInputChange,
  onLoginButtonClick,
}: ILoginScreen) => {
  return (
    <div className='w-screen h-screen flex items-center justify-center'>
      <div className="relative p-3 min-w-2xl">
        <div className='flex items-center justify-center w-full'>
          <Card elevate size="$4" bordered className='relative'>
            <Card.Header padded>
              <SectionTitle className='mb-0 text-center'>Login</SectionTitle>
            </Card.Header>
            <AppLoading
              isLoading={isLoading}
              className="w-10 h-10 !border-2"
              iconWidth={20}
              iconHeight={20}
              containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
            />
            <div className='p-5 min-w-[80vw] sm:min-w-xl'>
              <div className=''>
                <div>
                  <Label htmlFor="email" className='!text-base'>Email</Label>
                  <div className='input-wrapper mt-1'>
                    <Input
                      id="email"
                      placeholder="Enter email here..."
                      className='input'
                      value={fornContent.email}
                      onChangeText={(value) => onInputChange('email', value)}
                    />
                  </div>
                  {message.type === 'email' ?
                    <div className='text-red-500 w-full mt-1'>
                      <span>{message.content}</span>
                    </div> : null
                  }
                </div>
                <div className='mt-2'>
                  <Label htmlFor="password" className='!text-base'>Password</Label>
                  <div className='input-wrapper mt-1'>
                    <Input
                      id="password"
                      placeholder="Enter password here..."
                      className='input'
                      secureTextEntry
                      value={fornContent.password}
                      onChangeText={(value) => onInputChange('password', value)}
                    />
                  </div>
                  {message.type === 'password' ?
                    <div className='text-red-500 w-full mt-1'>
                      <span>{message.content}</span>
                    </div> : null
                  }
                </div>
                {message.type === 'error' ?
                  <div className='text-red-500 w-full'>
                    <span>{message.content}</span>
                  </div> : null
                }
                <div className='mt-5 flex justify-center'>
                  <AppButton
                    className='disabled:opacity-45 min-w-[138px]'
                    disabled={isLoading}
                    onClick={onLoginButtonClick}
                  >
                    <span>Login</span>
                  </AppButton>
                </div>
              </div>
              <div className="my-5 flex justify-center items-center gap-3 text-lumera-label text-sm">
                <div className='h-[1px] w-24 bg-lumera-label'></div>
                <div>Or</div>
                <div className='h-[1px] w-24 bg-lumera-label'></div>
              </div>
              <div className='flex justify-center'>
                <ConnectButton />
              </div>
              {message.type === 'wallet-error' ?
                <div className='text-red-500 w-full mt-1'>
                  <span>{message.content}</span>
                </div> : null
              }
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
