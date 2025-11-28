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
