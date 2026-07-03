'use client'

import { useTranslations } from 'next-intl'

export default function PrintButton() {
  const t = useTranslations('invoice')
  return (
    <div className="flex gap-3 print:hidden">
      <button
        onClick={() => window.print()}
        className="px-4 py-2 text-sm font-medium text-white rounded-lg"
        style={{ backgroundColor: '#1A1A2E' }}
      >
        {t('printButton')}
      </button>
      <button
        onClick={() => window.close()}
        className="px-4 py-2 text-sm font-medium rounded-lg border"
        style={{ borderColor: '#D1D5DB', color: '#374151' }}
      >
        {t('closeButton')}
      </button>
    </div>
  )
}
