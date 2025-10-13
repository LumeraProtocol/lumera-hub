import { useState } from "react";
import { OfflineSigner } from '@cosmjs/proto-signing';

import { useSelector, useDispatch } from '@/redux/hooks';
import { setWalletName, setModalOpen } from '@/redux/wallet.slice';
import useKeplr from '@/hooks/wallets/useKeplr';
import useLeap from '@/hooks/wallets/useLeap';

const useWalletConnect = () => {
    const dispatch = useDispatch();
    const { connectKeplr, disconnectKeplr, getKeplrOfflineSigner } = useKeplr();
    const { connectLeap, disconnectLeap, getLeapOfflineSigner } = useLeap();
    const { isConnected, address, walletName, isModalOpen } = useSelector((state) => state.wallet);
    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const handleConnect = async (walletName: string) => {
        setLoading(true);
        try {
            dispatch(setWalletName({
                walletName,
            }));
            switch (walletName) {
                case 'leap':
                    await connectLeap();
                    handleToggleModal(false);
                    break;
                case 'keplr':
                    await connectKeplr();
                    handleToggleModal(false);
                    break;
            }
        } catch (error) {
            console.log('error', error)
            // setError(error?.message)
        }
        setLoading(false);
    }

    const handleModalOpen = () => {
        dispatch(setModalOpen({
            status: true,
        }));
    }

    const handleToggleModal = (status: boolean) => {
         dispatch(setModalOpen({
            status,
        }));
        setLoading(false);
    }

    const handleDisconnect = async (walletName: string) => {
        try {
            switch (walletName) {
                case 'leap':
                    await disconnectLeap();
                    break;
                case 'keplr':
                    await disconnectKeplr();
                    break;
            }
            dispatch(setWalletName({
                walletName: '',
            }));
        } catch (error: unknown) {
            console.log('error', error)
            setError(error instanceof Error ? error.message : 'Unknown error')
        }
    }

    const getOfflineSigner = async () => {
        try {
            let offlineSigner: OfflineSigner | null = null;
            switch (walletName) {
                case 'leap':
                    offlineSigner = await getLeapOfflineSigner();
                    break;
                case 'keplr':
                    offlineSigner = await getKeplrOfflineSigner();
                    break;
            }
            return offlineSigner;
        } catch (error: unknown) {
           throw new Error(error instanceof Error ? error.message : 'Unknown error');
        }
        
    }

    return {
        isLoading,
        isModalOpen,
        error,
        isConnected,
        address,
        walletName,
        getOfflineSigner,
        handleModalOpen,
        handleConnect,
        handleDisconnect,
        handleToggleModal,
    }
}

export default useWalletConnect;