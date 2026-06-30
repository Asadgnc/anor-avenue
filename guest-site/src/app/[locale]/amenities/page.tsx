import { setRequestLocale } from 'next-intl/server'
import Navbar from '@/components/hotel/Navbar'
import Footer from '@/components/hotel/Footer'
import KitchenSection from '@/components/hotel/KitchenSection'
import GardenSection from '@/components/hotel/GardenSection'
import SecuritySection from '@/components/hotel/SecuritySection'
import ServicesSection from '@/components/hotel/ServicesSection'

type Props = { params: Promise<{ locale: string }> }

export default async function AmenitiesPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <>
      <Navbar />
      <main>
        <KitchenSection />
        <GardenSection />
        <SecuritySection />
        <ServicesSection />
      </main>
      <Footer />
    </>
  )
}
