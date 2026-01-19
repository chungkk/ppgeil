import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        {/* Preload critical CSS for popup animations */}
        <link
          rel="preload"
          href="/styles/DictionaryPopup.module.css"
          as="style"
        />

        {/* Google Fonts for Retro Admin Theme */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Press+Start+2P&family=VT323&display=swap"
          rel="stylesheet"
        />

        {/* DNS Prefetch for external resources */}
        <link rel="dns-prefetch" href="https://api.openai.com" />
        <link rel="dns-prefetch" href="https://api.groq.com" />

        {/* Preconnect to speed up API calls */}
        <link rel="preconnect" href="https://api.openai.com" crossOrigin="anonymous" />

        {/* Resource hints for better performance */}
        <link rel="prefetch" href="/api/dictionary" />
        <link rel="prefetch" href="/api/translate" />

        {/* Permissions Policy for microphone access */}
        <meta httpEquiv="Permissions-Policy" content="microphone=(self)" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
