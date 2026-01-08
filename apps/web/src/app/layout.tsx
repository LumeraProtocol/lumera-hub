import './globals.css'
import './styles.css'
import React from 'react'
import Script from 'next/script'
import ClientRoot from './providers/client-root'
import AppShell from '@/components/layout/AppShell'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const googleAnalysicsKey = process.env.NEXT_PUBLIC_GOOGLE_ANALYSICS_KEY;
  const googleTagManagerKey = process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_KEY;

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
        {googleAnalysicsKey ?
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalysicsKey}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAnalysicsKey}');
              `}
            </Script>
          </> : null
        }
        {googleAnalysicsKey ?
          <>
            <Script id="google-tag-manager" strategy="afterInteractive">
              {`
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${googleTagManagerKey}');
              `}
            </Script>
          </> : null
        }
      </head>
      <body>
        {googleTagManagerKey ?
          <noscript><iframe src={`https://www.googletagmanager.com/ns.html?id=${googleTagManagerKey}`}
          height="0" width="0" style={{ display:'none', visibility:'hidden' }}></iframe></noscript> : null
        }
        <ClientRoot>
          <AppShell>{children}</AppShell>
        </ClientRoot>
      </body>
    </html>
  )
}
