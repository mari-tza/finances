import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { PrimaryButton } from '../components/inputs'

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email.trim(), password)
    setLoading(false)
    if (error) setError('Email ou senha incorretos.')
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-sm"
      >
        <div className="text-center">
          <p className="text-3xl">🏠💰</p>
          <h1 className="mt-2 text-lg font-semibold text-slate-800">
            Finanças da Casa
          </h1>
          <p className="text-sm text-slate-400">Entre com seu login</p>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-500 focus:bg-white"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">
            Senha
          </span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-500 focus:bg-white"
          />
        </label>

        {error && (
          <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
            {error}
          </p>
        )}

        <PrimaryButton type="submit" disabled={loading || !email || !password}>
          {loading ? 'Entrando…' : 'Entrar'}
        </PrimaryButton>
      </form>
    </div>
  )
}
