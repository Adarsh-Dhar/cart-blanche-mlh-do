'use client'

import { useEffect, useState } from 'react'

interface LocaleDateProps {
  date: Date
  format?: 'date' | 'time' | 'datetime'
}

export function LocaleDate({ date, format = 'date' }: LocaleDateProps) {
  const isClient = typeof window !== 'undefined';
  if (!isClient) {
    return <span suppressHydrationWarning>{'-'}</span>;
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
