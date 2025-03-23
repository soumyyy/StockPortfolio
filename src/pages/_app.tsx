// pages/_app.tsx
import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { Inter } from 'next/font/google'
import Head from 'next/head'

const inter = Inter({ subsets: ['latin'] })

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
      </Head>
      <main className={inter.className}>
        <div className="min-h-screen bg-gray-900 text-white">
          <Component {...pageProps} />
        </div>
      </main>
    </>
  );
}

export default MyApp;