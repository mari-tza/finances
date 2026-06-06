import { useState } from 'react'
import { formatNumberBR, parseBRLInput } from '../utils/format'

const labelCls = 'mb-1 block text-xs font-medium text-slate-500'
const fieldCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-teal-500 focus:bg-white'

export function TextField(props: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="block">
      <span className={labelCls}>{props.label}</span>
      <input
        className={fieldCls}
        type={props.type ?? 'text'}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </label>
  )
}

/** Campo de dinheiro: digita livre, formata em pt-BR ao sair do campo. */
export function MoneyField(props: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  const [text, setText] = useState(
    props.value ? formatNumberBR(props.value) : '',
  )
  return (
    <label className="block">
      <span className={labelCls}>{props.label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          R$
        </span>
        <input
          className={`${fieldCls} pl-9 tabular-nums`}
          inputMode="decimal"
          value={text}
          placeholder="0,00"
          onChange={(e) => {
            setText(e.target.value)
            props.onChange(parseBRLInput(e.target.value))
          }}
          onBlur={() =>
            setText(props.value ? formatNumberBR(props.value) : '')
          }
        />
      </div>
    </label>
  )
}

export function SelectField<T extends string>(props: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <label className="block">
      <span className={labelCls}>{props.label}</span>
      <select
        className={fieldCls}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as T)}
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function PrimaryButton(props: {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  return (
    <button
      type={props.type ?? 'button'}
      onClick={props.onClick}
      disabled={props.disabled}
      className="w-full rounded-xl bg-teal-600 py-3 font-semibold text-white shadow-sm transition-colors active:bg-teal-700 disabled:opacity-40"
    >
      {props.children}
    </button>
  )
}
