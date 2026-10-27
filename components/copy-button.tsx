'use client'

import { useState } from 'react'

export function CopyButton({ text, label = '复制' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setDone(true)
    setTimeout(() => setDone(false), 1800)
  }

  return (
    <button className="btn ghost small" type="button" onClick={copy}>
      {done ? '已复制' : label}
    </button>
  )
}
