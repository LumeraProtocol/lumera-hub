import { Card } from 'tamagui';

import { AppLoading } from '@/components/Loading';
import useSnagBalance from '@/hooks/useSnagBalance';

export const BalanceVerifyScreen = () => {
  const {
    isLoading,
    message,
  } = useSnagBalance();

  return (
    <div className='w-screen h-screen flex items-center justify-center'>
      <div className="relative p-3 min-w-2xl">
        <div className='flex items-center justify-center w-full'>
          <Card elevate size="$4" bordered className='relative'>
            <div className="min-h-56 min-w-[80vw] sm:min-w-xl h-full flex items-center justify-center">
              {isLoading ?
                <div className='inline-flex items-center justify-center gap-3 w-auto'>
                  <AppLoading
                    isLoading
                    className="w-10 h-10 !border-2"
                    iconWidth={20}
                    iconHeight={20}
                    containerClassName='relative w-10 h-10 z-50'
                  />
                  <span>Processing ...</span>
                </div> :
                <>
                  {message.type === 'error' ?
                    <div className='text-red-500 w-full mt-3 text-center'>
                      <span>{message.content}</span>
                    </div> : null
                  }
                  {message.type === 'success' ?
                    <div className='text-lumera-teal w-full mt-3 text-center'>
                      <span>{message.content}</span>
                    </div> : null
                  }
                </>
              }
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
