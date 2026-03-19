import type { SandwichComposition } from '@/types'

export type ShareRecord = {
  hash: string
  name: string
  composition: SandwichComposition
}

type CreateShareResponse = {
  data: { hash: string; url: string }
}

type FetchShareResponse = {
  data: ShareRecord
}

export const createShare = async (params: {
  composition: SandwichComposition
  name: string
}): Promise<{ hash: string; url: string }> => {
  const url = new URL('/api/sandwiches/share', window.location.origin)
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error(`Failed to create share: ${String(response.status)}`)
  }

  const body = (await response.json()) as unknown
  return (body as CreateShareResponse).data
}

export const fetchShare = async (hash: string): Promise<ShareRecord> => {
  const url = new URL(`/api/sandwiches/share/${hash}`, window.location.origin)
  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(`Failed to fetch share: ${String(response.status)}`)
  }

  const body = (await response.json()) as unknown
  return (body as FetchShareResponse).data
}
