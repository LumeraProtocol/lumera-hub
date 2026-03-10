import { ConnectButton } from '@/components/ConnectWallet';
import { AppLoading } from '@/components/Loading';
import useSnag from '@/hooks/useSnag';

export const WalletConnectScreen = () => {
  const { isLoading } = useSnag();

  return (
    <div className='w-screen h-screen flex items-center justify-center'>
      <div className="relative p-3 min-w-2xl">
        <AppLoading
          isLoading={isLoading}
          className="w-10 h-10 !border-2"
          iconWidth={20}
          iconHeight={20}
          containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
        />
        <h2 className='font-normal text-white text-4xl mt-5 text-center'>Wallet Connect</h2>
        <p className='text-base font-normal text-lumera-gray mt-2 mx-auto max-w-[420px] text-center'>
          Get started by connecting your wallet.
        </p>
        <div className="mt-6 mb-5 text-center w-full flex justify-center">
          <ConnectButton />
        </div>
      </div>
    </div>
  );
}
