import { useState } from "react";

import { useSelector, useDispatch } from '@/redux/hooks';
import { setAddress, setConnected } from '@/redux/wallet.slice';
import { CHAIN_ID } from '@/contants/network';

const useLeap = () => {
    const dispatch = useDispatch();
    const { isConnected } = useSelector((state) => state.wallet);
    const [isLoading, setLoading] = useState<boolean>(false);

    const connectLeap = async (): Promise<void> => {
        if (!window.leap) {
            throw new Error('Leap wallet is not installed!');
        }
        setLoading(true);
        try {
            await window.leap.enable(CHAIN_ID);
            const offlineSigner = window.leap.getOfflineSigner(CHAIN_ID);
            const accounts = await offlineSigner.getAccounts();
            dispatch(setAddress({
                address: accounts[0].address,
            }))
            dispatch(setConnected({
                status: true,
            }))
        } catch (err: unknown) {
            throw new Error('Connect Leap error: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
        setLoading(false);
    };

    const disconnectLeap = () => {
        try {
            dispatch(setAddress({
               address: '',
           }));
           dispatch(setConnected({
               status: false,
           }));
        } catch (err: unknown) {
            throw new Error('Disconnect Leap error: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    }

    const getLeapOfflineSigner = async () => {
        if (!window.leap) {
            throw new Error('Leap wallet is not installed!');
        }
        if (!isConnected) {
            throw new Error('Please connect Leap wallet before using.');
        }
        const offlineSigner = window.leap.getOfflineSigner(CHAIN_ID);

        return offlineSigner;
    }

    return {
        isLoading,
        connectLeap,
        disconnectLeap,
        getLeapOfflineSigner,
    }
}

export default useLeap;
