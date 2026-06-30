import BottomNav from '@/components/BottomNav'
import AppHeader from '@/components/AppHeader'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh flex flex-col bg-paper overflow-hidden">
      <AppHeader />
      <main className="flex-1 overflow-y-auto pb-24 max-w-2xl w-full mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
