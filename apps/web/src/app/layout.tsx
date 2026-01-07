import './globals.css'
import './styles.css'
import React from 'react'
import Script from 'next/script'
import ClientRoot from './providers/client-root'
import AppShell from '@/components/layout/AppShell'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const googleTagAccount = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/lumera.png" />
        <meta property="og:url" content="https://hub.testnet.lumera.io/" />
        <meta name="keywords" content="Lumera, lumera staking, lumera governance, lumera wallet, lumera station, staking, governance, lumera protocol" />
        <meta name="description" content="A unified interface for lumera staking, governance and wallets." />
        <meta name="author" content="Lumera" />
        <meta property="og:type" content="exchange" />
        <meta property="og:image" content="https://hub.testnet.lumera.io/lumera-symbol.svg" />
        <meta property="og:description" content="A unified interface for lumera staking, governance and wallets." />
        <meta property="og:title" content="Lumera Hub - Web3 infrastructure built for scale." />
        <meta property="og:site_name" content="Lumera Hub - Web3 infrastructure built for scale." />
        <meta property="title" content="Lumera Hub - Web3 infrastructure built for scale." />
        {googleTagAccount ?
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleTagAccount}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleTagAccount}');
              `}
            </Script>
          </> : null
        }
      </head>
      <body>
        <ClientRoot>
          <AppShell>{children}</AppShell>
        </ClientRoot>
      </body>
    </html>
  )
}
