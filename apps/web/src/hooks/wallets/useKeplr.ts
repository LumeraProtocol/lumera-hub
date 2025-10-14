import { useState } from "react";

import { useSelector, useDispatch } from '@/redux/hooks';
import { setAddress, setConnected } from '@/redux/wallet.slice';
import { CHAIN_ID } from '@/contants/network';

const useKeplr = () => {
    const dispatch = useDispatch();
    const { isConnected } = useSelector((state) => state.wallet);
    const [isLoading, setLoading] = useState<boolean>(false);

    const connectKeplr = async (): Promise<void> => {
        if (!window.keplr) {
            throw new Error('Keplr wallet is not installed!');
        }
        setLoading(true);
        try {
            await window.keplr.enable(CHAIN_ID);
            const offlineSigner = window.keplr.getOfflineSigner(CHAIN_ID);
            const accounts = await offlineSigner.getAccounts();
            dispatch(setAddress({
                address: accounts[0].address,
            }))
            dispatch(setConnected({
                status: true,
            }))
        } catch (err: unknown) {
            throw new Error('Connect Keplr error: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
        setLoading(false);
    };

    const disconnectKeplr = () => {
        try {
            dispatch(setAddress({
               address: '',
           }));
           dispatch(setConnected({
               status: false,
           }));
        } catch (err: unknown) {
            throw new Error('Disconnect Keplr error: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    }

    const getKeplrOfflineSigner = async () => {
        if (!window.keplr) {
            throw new Error('Keplr wallet is not installed!');
        }
        if (!isConnected) {
            throw new Error('Please connect Keplr wallet before using.');
        }
        const offlineSigner = window.keplr.getOfflineSigner(CHAIN_ID);
        return offlineSigner;
    }


    return {
        connectKeplr,
        disconnectKeplr,
        getKeplrOfflineSigner,
        isLoading,
    }
}

export default useKeplr;
