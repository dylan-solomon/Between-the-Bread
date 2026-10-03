import type { UsernameCheck } from '@/hooks/useUsernameCheck'

export const USERNAME_NOTICE =
  "Your username appears on your comments and on community sandwiches you're the first to make."

type Props = {
  id: string
  value: string
  onChange: (value: string) => void
  check: UsernameCheck
}

const messageClass = (check: UsernameCheck): string => {
  if (check.status === 'available') return 'text-green-700'
  if (check.status === 'checking' || check.status === 'idle') return 'text-neutral-500'
  return 'text-red-700'
}

export default function UsernameField({ id, value, onChange, check }: Props) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700">
        Username
      </label>
      <input
        id={id}
        type="text"
        autoComplete="nickname"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={20}
        value={value}
        onChange={(e) => { onChange(e.target.value) }}
        aria-describedby={`${id}-help`}
        className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <div id={`${id}-help`}>
        {check.message !== null && <p className={`mt-1 text-xs ${messageClass(check)}`}>{check.message}</p>}
        <p className="mt-1 text-xs text-neutral-500">{USERNAME_NOTICE}</p>
      </div>
    </div>
  )
}
