'use client'

import { useEffect } from 'react'

export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl rounded-t-2xl overflow-y-auto"
        style={{ background: '#fff', maxHeight: '92vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: '#E3DFD6' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: '#E3DFD6' }}>
          <h2
            className="text-xl font-bold uppercase"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#0A0A0A' }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none"
            style={{ color: '#6F6B62' }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 pb-8">{children}</div>
      </div>
    </div>
  )
}
