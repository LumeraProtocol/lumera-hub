import './globals.css'
import './styles.css'
import React from 'react'
import Script from 'next/script'
import { Geist, Geist_Mono } from 'next/font/google'
import ClientRoot from './providers/client-root'
import LayoutWrapper from '@/components/layout/LayoutWrapper'
import { SITE_URL, NETWORK_LABEL, IS_MAINNET } from '@/contants/network'

// The --font-geist-* variables were previously declared in globals.css but
// never bound to a font file, so the app fell through to Arial. next/font
// self-hosts both faces and supplies the variables the theme references.
const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const googleAnalysicsKey = process.env.NEXT_PUBLIC_GOOGLE_ANALYSICS_KEY;
  const googleTagManagerKey = process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_KEY;
  // Naming the network in the title keeps the two hubs apart in a tab strip.
  const siteTitle = IS_MAINNET
    ? 'Lumera Hub'
    : `Lumera Hub · ${NETWORK_LABEL}`;
  const siteDescription = IS_MAINNET
    ? 'A unified interface for Lumera staking, governance and wallets.'
    : `A unified interface for Lumera staking, governance and wallets, running against ${NETWORK_LABEL}. Tokens have no value.`;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="icon" type="image/png" href="/lumera.png" />
        {/* The hub ships as two deployments. These were hardcoded to the
            testnet host, so the mainnet build advertised testnet URLs in every
            share card; they now follow the active network profile. */}
        <link rel="canonical" href={`${SITE_URL}/`} />
        <meta property="og:url" content={`${SITE_URL}/`} />
        <meta name="keywords" content="Lumera, lumera staking, lumera governance, lumera wallet, lumera station, staking, governance, lumera protocol" />
        <meta name="description" content={siteDescription} />
        <meta name="author" content="Lumera" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${SITE_URL}/lumera-symbol.svg`} />
        <meta property="og:description" content={siteDescription} />
        <meta property="og:title" content={siteTitle} />
        <meta property="og:site_name" content={siteTitle} />
        <meta property="title" content={siteTitle} />
        {/* A testnet hub must never be indexed alongside the mainnet one. */}
        {IS_MAINNET ? null : <meta name="robots" content="noindex, nofollow" />}
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
        {googleTagManagerKey ?
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
      <body suppressHydrationWarning>
        {googleTagManagerKey ?
          <noscript><iframe src={`https://www.googletagmanager.com/ns.html?id=${googleTagManagerKey}`}
          height="0" width="0" style={{ display:'none', visibility:'hidden' }}></iframe></noscript> : null
        }
        <ClientRoot>
          <LayoutWrapper>{children}</LayoutWrapper>
        </ClientRoot>
        {/* First-load splash: in the initial HTML so it covers the blank while
            the app's JS downloads and hydrates. ClientRoot fades and removes it
            on mount. Styled in globals.css (#lm-splash). */}
        <div id="lm-splash" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="lm-splash-mark" src="/lumera-mark.svg" alt="" width={46} height={46} />
          <span className="lm-splash-bar" />
        </div>
      </body>
    </html>
  )
}
