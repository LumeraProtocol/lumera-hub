'use client'

import { Wallet, LogOut } from '@tamagui/lucide-icons'
import { useChain } from '@interchain-kit/react'
import { InterchainWalletModal } from '@interchain-kit/react';

import useWalletConnect from '@/hooks/useWalletConnect';
import useAccountInfo from '@/hooks/useAccountInfo';
import { formatAddress } from '@/utils/format';
import { CHAIN_NAME } from '@/contants/network';

export function WalletModalComponent() {
  return (
    <div className='relative z-50'>
      <InterchainWalletModal />
    </div>
  );
}

export function ConnectWallet() {
  const { address, disconnect, openView } = useChain(CHAIN_NAME);
  const { handleTestClaimButtonClick } = useAccountInfo();

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {!address ?
        <button
          onClick={openView}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors flex cursor-pointer"
        >
          <Wallet size="$1" /> <div className="ml-1 connect-wallet-label">Connect Wallet</div>
        </button> :
        <>
          <span className='btn-address'>{formatAddress(address, 5, -4)}</span>
          <button onClick={() => disconnect()} className='btn-logout'><LogOut /></button>
          <button onClick={handleTestClaimButtonClick} className='btn-logout'>Claim</button>
        </>
      }
    </div>
  )
}

// export function WalletModalComponent() {
//   const { isModalOpen, handleToggleModal, error, handleConnect, isLoading } = useWalletConnect();

//   if (!isModalOpen) {
//     return null;
//   }

//   return (
//     <Dialog
//       open
//       onOpenChange={handleToggleModal}
//       modal
//     >
//       <Dialog.Trigger asChild>
//       </Dialog.Trigger>

//       <Dialog.Portal>
//         <Dialog.Overlay
//           key="overlay"
//           animation="quick"
//           opacity={0.5}
//           enterStyle={{ opacity: 0 }}
//           exitStyle={{ opacity: 0 }}
//         />

//         <Dialog.Content
//           bordered
//           elevate
//           key="content"
//           animation={[
//             'quick',
//             {
//               opacity: {
//                 overshootClamping: true,
//               },
//             },
//           ]}
//           enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
//           exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
//           x={0}
//           scale={1}
//           opacity={1}
//           y={0}
//         >
//           <div className='vote-main-content'>
//             <div className='flex flex-col gap-3'>
//               <button
//                 className='flex gap-4 items-center bg-gray-900 border border-gray-800 rounded-lg py-2 px-4 min-w-52 hover:bg-gray-800 hover:border-gray-700 cursor-pointer'
//                 onClick={() => handleConnect('keplr')}
//                 disabled={isLoading}
//               >
//                 <Image src="/keplr.svg" alt="Keplr wallet" width={32} height={32} /> <span className='text-xl'>Keplr</span>
//               </button>
//               <button
//                 className='flex gap-4 items-center bg-gray-900 border border-gray-800 rounded-lg py-2 px-4 min-w-52 hover:bg-gray-800 hover:border-gray-700 cursor-pointer'
//                 onClick={() => handleConnect('leap')}
//                 disabled={isLoading}
//               >
//                 <Image src="/leap.svg" alt="Leap wallet" width={32} height={32} />  <span className='text-xl'>Leap</span>
//               </button>
//             </div>
//             {error ?
//               <div className='text-lumera-red-light mt-3'>{error}</div> : null
//             }
//           </div>
//           <div className='btn-wallet-close'>
//             <Unspaced>
//               <Dialog.Close asChild>
//                 <Button position="absolute" right="$3" size="$2" circular icon={X} />
//               </Dialog.Close>
//             </Unspaced>
//           </div>
//         </Dialog.Content>
//       </Dialog.Portal>
//     </Dialog>
//   );
// }

// export function ConnectWallet() {
//   const { address, walletName, handleDisconnect, handleToggleModal } = useWalletConnect();
//   return (
//     <div style={{ display: 'flex', gap: 8 }}>
//       {!address ?
//         <button
//           onClick={() => handleToggleModal(true)}
//           className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors flex cursor-pointer"
//         >
//           <Wallet size="$1" /> <div className="ml-1 connect-wallet-label">Connect Wallet</div>
//         </button> :
//         <>
//           <span className='btn-address'>{formatAddress(address, 5, -4)}</span>
//           <button onClick={() => handleDisconnect(walletName)} className='btn-logout'><LogOut /></button>
//         </>
//       }
//     </div>
//   )
// }

export function ConnectWalletButton() {
  const { address, handleToggleModal } = useWalletConnect();
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {!address ?
        <button
          onClick={() => handleToggleModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors flex cursor-pointer"
        >
          <Wallet size="$1" /> <div className="ml-1">Connect Wallet</div>
        </button> : null
      }
    </div>
  )
}
