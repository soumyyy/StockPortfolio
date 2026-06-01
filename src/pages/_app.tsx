// pages/_app.tsx
import '../styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useEffect, useState } from 'react'

function MyApp({ Component, pageProps }: AppProps) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
      return;
    }

    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch((error) => {
        console.log('SW cleanup failed: ', error);
      });
  }, []);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
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
      </Head>
      <main>
        <div className="min-h-screen bg-[#0A0A0A] text-white/90">
          {!isOnline && (
            <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-[100] sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96">
              <div className="rounded-2xl border border-amber-300/20 bg-[#15110A]/95 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.8)]" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-amber-100">Offline mode</div>
                    <div className="mt-0.5 text-xs leading-5 text-amber-100/65">
                      Showing the cached app shell. Live prices, refresh, and holding updates need a connection.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <Component {...pageProps} />
        </div>
      </main>
    </>
  );
}

export default MyApp;
