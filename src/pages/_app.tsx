// pages/_app.tsx
import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <main className={inter.className}>
      <div className="min-h-screen bg-gray-900 text-white">
        <Component {...pageProps} />
      </div>
    </main>
  );
}

export default MyApp;