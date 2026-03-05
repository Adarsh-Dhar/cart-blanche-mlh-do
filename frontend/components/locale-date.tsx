'use client'

import { useEffect, useState } from 'react'

interface LocaleDateProps {
  date: Date
  format?: 'date' | 'time' | 'datetime'
}

export function LocaleDate({ date, format = 'date' }: LocaleDateProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <span>{'-'}</span>
  }

  if (format === 'date') {
    return <span>{date.toLocaleDateString()}</span>
  }

  if (format === 'time') {
    return (
      <span>
        {date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    )
  }

  return (
    <span>
      {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  )
}
