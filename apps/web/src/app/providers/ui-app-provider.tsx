'use client'

import React from 'react'
import { AppProvider } from '@lumera-hub/ui'
 import { ToastContainer } from 'react-toastify'

export default function UIAppProvider({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      {children}
      <ToastContainer autoClose={5000} hideProgressBar closeOnClick newestOnTop />
    </AppProvider>
  )
}
