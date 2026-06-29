import BottomNav from '@/components/BottomNav'
import AppHeader from '@/components/AppHeader'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <AppHeader />
      <main className="flex-1 pb-24 max-w-2xl w-full mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
