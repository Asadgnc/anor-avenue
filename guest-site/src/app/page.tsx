import { redirect } from 'next/navigation'

// Middleware handles locale routing; this fallback redirects bare "/" to "/uz"
export default function RootPage() {
  redirect('/uz')
}
