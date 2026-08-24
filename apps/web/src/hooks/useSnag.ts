'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { useChain } from '@interchain-kit/react'
import { useRouter } from 'next/navigation'

import * as instance from '@/utils/api'
import { CHAIN_NAME } from '@/contants/network'

const useSnag = () => {
  const router = useRouter()
  const [isLoading, setLoading] = useState(false)
  const { address, status } = useChain(CHAIN_NAME)
  const [isClick, setClick] = useState(false)

  const saveWalletConnect = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(window.location.search)
      const walletAddress = params.get('walletAddress')
      if (walletAddress) {
        await instance.postExternal('/api/snag/save-user', {
          lumeraAddress: address,
          snagAddress: walletAddress,
        })
        toast.success('Wallet connected!', {
          position: 'bottom-right',
          theme: 'dark',
        })
        sessionStorage.setItem('start_new_session', 'true')
        router.push('/')
      }
    } catch (error) {
      console.error(error)
      toast.error((error as Error)?.message || 'An unknown error occurred.', {
        position: 'bottom-right',
        theme: 'dark',
      })
    } finally {
      setLoading(false)
    }
  }, [address, router])

  useEffect(() => {
    const btn = document.querySelector('#connectWallet')
    const handleConnectClick = () => setClick(true)

    btn?.addEventListener('click', handleConnectClick)
    return () => btn?.removeEventListener('click', handleConnectClick)
  }, [])

  useEffect(() => {
    if (!isClick || !address || status !== 'Connected') return

    // Consume the click before starting the request so subsequent wallet-state
    // updates cannot submit the same connection twice.
    setClick(false)
    void saveWalletConnect()
  }, [address, isClick, saveWalletConnect, status])

  return {
    isLoading,
  }
}

export default useSnag
