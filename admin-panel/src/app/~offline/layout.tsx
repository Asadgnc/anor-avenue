// Offline sayfası [locale] ağacının DIŞINDA: middleware/i18n gerektirmez,
// service worker precache'inden kimlik doğrulamasız servis edilebilir.
// Kök layout passthrough olduğu için <html>'i bu segment kendisi render eder
// ([locale]/layout.tsx ile aynı yerleşik desen).

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#F8FAFC' }}>
        {children}
      </body>
    </html>
  )
}
