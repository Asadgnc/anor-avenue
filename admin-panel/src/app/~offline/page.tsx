// İnternet yokken gösterilen yedek sayfa (3 dil tek sayfada — i18n altyapısız).

export const dynamic = 'force-static'

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '420px',
          width: '100%',
          textAlign: 'center',
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '40px 32px',
          boxShadow: '0 1px 3px rgba(22,35,59,0.12)',
        }}
      >
        <div style={{ fontSize: '48px', lineHeight: 1 }}>📡</div>
        <h1 style={{ color: '#16233B', fontSize: '20px', margin: '20px 0 8px' }}>
          Интернет йўқ / Internet yo&#39;q
        </h1>
        <p style={{ color: '#64748B', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
          Нет подключения к интернету. Проверьте связь и попробуйте снова.
          <br />
          Internet aloqasi yo&#39;q. Aloqani tekshirib, qayta urinib ko&#39;ring.
        </p>
        {/* Bilerek <a>: offline sayfasında tam sayfa yenileme gerekir (bağlantı
            geri geldiğinde sunucudan taze veri çekilsin diye) */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/dashboard"
          style={{
            display: 'inline-block',
            marginTop: '24px',
            padding: '10px 24px',
            borderRadius: '10px',
            background: '#16233B',
            color: '#D9A441',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Қайта уриниш / Qayta urinish
        </a>
      </div>
    </main>
  )
}
