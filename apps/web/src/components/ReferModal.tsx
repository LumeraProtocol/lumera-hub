import {
  Dialog,
  VisuallyHidden,
} from 'tamagui';

import useRefer from '@/hooks/useRefer';
import { ConnectWalletButton } from '@/components/ConnectWallet';
import { formatAddress } from '@/utils/format';

export default function ReferModal() {
  const {
    showModal,
    referAddress,
    handleToogleModal,
    handleConnectWalletButtonClick,
  } = useRefer();

  return (
    <Dialog
      open={showModal}
      onOpenChange={handleToogleModal}
      modal
    >
      <Dialog.Trigger asChild>
      </Dialog.Trigger>

      <Dialog.Portal zIndex={50}>
        <Dialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          zIndex={49}
        />

        <Dialog.Content
          bordered
          elevate
          key="content"
          animation={[
            'quick',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          x={0}
          scale={1}
          opacity={1}
          y={0}
          zIndex={51}
        >
          <VisuallyHidden>
            <Dialog.Title></Dialog.Title>
          </VisuallyHidden>
          <div className='relative text-center p-5 w-full max-w-[750px]'>
            <div className='flex flex-col items-center justify-center'>
              <h2 className='font-normal text-white text-2xl md:text-4xl'>Welcome to the Lumera Hub</h2>
              <p className='text-base font-normal text-lumera-gray mx-auto max-w-[420px] text-center mt-6'>Connect your wallet to manage assets, participate in governance, and access the full suite of Lumera services.</p>
              <p className='text-base font-normal text-lumera-gray mt-1 mx-auto max-w-[420px] text-center'>
                You{"'"}ve been invited by {formatAddress(referAddress, 12, -5)}.
              </p>
              <div className='text-center mt-6'>
                <ConnectWalletButton onClick={handleConnectWalletButtonClick} />
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
