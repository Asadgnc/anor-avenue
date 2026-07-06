import { redirect } from 'next/navigation'

// The garden page was consolidated into the warehouse (Phase 3): materials live
// under /depo?area=garden and garden tasks are shown there too. This route now
// just forwards, so any old links / bookmarks keep working.
export default function GardenPage() {
  redirect('/depo?area=garden')
}
