import { useMemo, useRef, useState } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  /** Se llama al elegir una opción (click o Enter). Útil para campos que
   *  agregan a una lista y limpian el input. */
  onPick?: (v: string) => void
  loading?: boolean
}

const MAX = 12

export function Autocomplete({ value, onChange, options, placeholder, onPick, loading }: Props) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const blurTimer = useRef<number | undefined>(undefined)

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return options.slice(0, MAX)
    const starts: string[] = []
    const contains: string[] = []
    for (const o of options) {
      if (o.startsWith(q)) starts.push(o)
      else if (o.includes(q)) contains.push(o)
      if (starts.length >= MAX) break
    }
    return [...starts, ...contains].slice(0, MAX)
  }, [value, options])

  function choose(v: string) {
    onChange(v)
    onPick?.(v)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHi((h) => Math.min(h + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHi((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && matches[hi]) {
        e.preventDefault()
        choose(matches[hi])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="ac">
      <input
        value={value}
        placeholder={loading ? 'cargando…' : placeholder}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setHi(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 120)
        }}
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <ul className="ac-list" onMouseDown={() => clearTimeout(blurTimer.current)}>
          {matches.map((m, i) => (
            <li
              key={m}
              className={i === hi ? 'hi' : ''}
              onMouseEnter={() => setHi(i)}
              onClick={() => choose(m)}
            >
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
