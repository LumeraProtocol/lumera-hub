import {
  Card,
} from 'tamagui';

import { AppLoading } from '@/components/Loading';

interface IVerifyInteractModules {
  isLoading: boolean;
  message: {
    type: string;
    content: string;
  };
}

export const VerifyInteractModules = ({
  isLoading,
  message,
}: IVerifyInteractModules) => {
  return (
    <div className='flex items-center justify-center'>
      <Card elevate size="$4" bordered className='relative !w-full'>
        <div className='p-5 w-full'>
          <div className="relative min-h-40 flex items-center justify-center">
            {isLoading ?
              <div className="relative flex justify-between items-center flex-col">
                <AppLoading
                  isLoading={isLoading}
                  className="w-10 h-10 !border-2"
                  iconWidth={20}
                  iconHeight={20}
                  containerClassName='relative w-10 h-10 z-50'
                />
                <div className='text-sm mt-2'>Processing ...</div>
              </div> : null
            }
            {message.type === 'error' ?
              <div className='text-red-500 w-full text-center'>
                <span>{message.content}</span>
              </div> : null
            }
            {message.type === 'success' ?
              <div className='text-lumera-teal w-full text-center'>
                <span>{message.content}</span>
              </div> : null
            }
          </div>
        </div>
      </Card>
    </div>
  );
}
