import { Link } from 'react-router-dom'
import AdminBadge from '@/components/AdminBadge'

type Props = { username: string | null; isAdmin: boolean }

export default function AuthorName({ username, isAdmin }: Props) {
  if (username === null) return <p className="text-sm font-medium text-neutral-900">Member</p>

  return (
    <p className="text-sm font-medium text-neutral-900">
      <Link to={`/u/${username}`} className="hover:text-primary hover:underline">{`@${username}`}</Link>
      {isAdmin && <AdminBadge />}
    </p>
  )
}
