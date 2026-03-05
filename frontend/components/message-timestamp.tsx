'use client'

import { useEffect, useState } from 'react'

interface MessageTimestampProps {
  date: Date
}

export function MessageTimestamp({ date }: MessageTimestampProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <p className="text-xs mt-2 opacity-70" suppressHydrationWarning>-:--</p>
  }

  return (
    <p className="text-xs mt-2 opacity-70">
      {date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}
    </p>
  )
}
