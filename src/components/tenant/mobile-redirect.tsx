'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MobileRedirect({ to }: { to: string }) {
  const router = useRouter()
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mobile = window.matchMedia('(max-width: 767px)').matches
    if (mobile) router.replace(to)
  }, [router, to])
  return null
}
