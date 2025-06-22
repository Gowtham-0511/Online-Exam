import type { AppProps } from "next/app";
import "@/styles/globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from 'react-hot-toast';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <Toaster position="top-center" />
      <Component {...pageProps} />
    </SessionProvider>
  );
}
