import './globals.css'
import React from 'react'
import ClientRoot from './providers/client-root'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  )
}
