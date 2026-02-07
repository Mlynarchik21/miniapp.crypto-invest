export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <title>CryptoInvest Mini App</title>
      </head>
      <body style={{ margin: 0, background: "#0B0F1A" }}>{children}</body>
    </html>
  );
}
