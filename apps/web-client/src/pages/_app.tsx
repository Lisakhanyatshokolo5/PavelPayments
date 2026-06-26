import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <style global jsx>{`
        *, *::before, *::after { box-sizing: border-box; }
        html { font-size: 16px; }
        body {
          margin: 0;
          background: #f1f5f9;
          color: #1e293b;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        a { color: inherit; }
        button {
          cursor: pointer;
          font-family: inherit;
        }
        input, select, textarea {
          font-family: inherit;
        }
      `}</style>
      <Component {...pageProps} />
    </>
  );
}
