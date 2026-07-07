// Sayfa yüklenirken gösterilen iskelet (Suspense/loading.tsx fallback).
// Veri gelene kadar navigasyonun anında boyanmasını sağlar.

function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-foreground/[0.06] ${className}`} />
}

export default function PageSkeleton({
  variant = 'cards',
}: {
  variant?: 'cards' | 'table' | 'grid'
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Block className="h-7 w-56" />
        <Block className="h-4 w-40" />
      </div>

      {variant === 'cards' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Block className="h-24" />
            <Block className="h-24" />
            <Block className="h-24" />
            <Block className="h-24" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Block className="h-72" />
            <Block className="h-72" />
          </div>
        </>
      )}

      {variant === 'table' && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <Block className="h-10 w-64" />
            <Block className="h-10 w-40" />
          </div>
          <Block className="h-12 w-full" />
          <Block className="h-12 w-full" />
          <Block className="h-12 w-full" />
          <Block className="h-12 w-full" />
          <Block className="h-12 w-full" />
          <Block className="h-12 w-full" />
        </div>
      )}

      {variant === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <Block className="h-32" />
          <Block className="h-32" />
          <Block className="h-32" />
          <Block className="h-32" />
          <Block className="h-32" />
          <Block className="h-32" />
          <Block className="h-32" />
          <Block className="h-32" />
        </div>
      )}
    </div>
  )
}
