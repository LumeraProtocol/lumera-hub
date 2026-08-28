import { YStack, Card } from 'tamagui';
import { Wallet } from 'lucide-react';

import { ConnectWalletButton } from '@/components/ConnectWallet';

interface INoWalletConnected {
  variant?: string;
}

export default function NoWalletConnected({
  variant,
}: INoWalletConnected) {
  if (variant === 'home') {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" gap="$2">
        <Card elevate size="$4" bordered className='w-full'>
          <div className='flex flex-col items-center justify-center welcome-section'>
            <h2 className='font-normal text-white text-4xl mt-5'>Welcome to the Lumera Hub</h2>
            <p className='text-base font-normal text-lumera-gray mt-2 mx-auto max-w-[420px] text-center'>Connect your wallet to manage assets, participate in governance, and access the full suite of Lumera services.</p>
            <div className='text-center mt-6'>
              <ConnectWalletButton />
            </div>
          </div>
        </Card>
      </YStack>
    );
  }

  if (variant === 'small') {
    return (
      <div className='flex flex-col items-center justify-center h-full'>
        <div className="w-14 h-14 rounded-full grid place-items-center bg-lumera-icon-bg">
          <Wallet className='w-6 h-6 text-lumera-teal' />
        </div>
        <h2 className='font-normal text-white text-xl mt-3'>No Wallet Connected</h2>
        <p className='text-base font-normal text-lumera-gray mt-0 mx-auto max-w-[420px] text-center'>
          Get started by connecting your wallet.
        </p>
        <div className='text-center mt-4'>
          <ConnectWalletButton />
        </div>
      </div>
    )
  }

  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$2">
      <Card elevate size="$4" bordered className='w-full'>
        <div className='flex flex-col items-center justify-center min-h-[80vh]'>
          <div className="w-20 h-20 rounded-full grid place-items-center bg-lumera-icon-bg">
            <Wallet className='w-9 h-9 text-lumera-teal' />
          </div>
          <h2 className='font-normal text-white text-4xl mt-5'>No Wallet Connected</h2>
          <p className='text-base font-normal text-lumera-gray mt-2 mx-auto max-w-[420px] text-center'>Please connect your wallet to view this page and interact with the Lumera ecosystem.</p>
          <div className='text-center mt-6'>
            <ConnectWalletButton />
          </div>
        </div>
      </Card>
    </YStack>
  );
}
