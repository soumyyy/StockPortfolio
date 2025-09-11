// pages/_app.tsx
import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { Inter } from 'next/font/google'
import Head from 'next/head'
import { useEffect } from 'react'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
})

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }
  }, []);

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0A0A0A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://query1.finance.yahoo.com" />
        <link rel="preconnect" href="https://api.vercel.com" />
      </Head>
      <main className={inter.className}>
        <div className="min-h-screen bg-[#0A0A0A] text-white/90">
          <Component {...pageProps} />
        </div>
      </main>
    </>
  );
}

export default MyApp;