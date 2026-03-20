import { ImageResponse } from '@vercel/og'
import * as React from 'react'

export const config = { runtime: 'edge' }

type Ingredient = { name: string; slug: string }
type Composition = {
  bread?: Ingredient[]
  protein?: Ingredient[]
  cheese?: Ingredient[]
  toppings?: Ingredient[]
  condiments?: Ingredient[]
  'chefs-special'?: Ingredient[]
}

type ShareData = {
  name: string
  composition: Composition
}

const NO_CHEESE_SLUG = 'no-cheese'

const buildIngredientList = (composition: Composition): string =>
  [
    ...(composition.protein ?? []),
    ...(composition.cheese ?? []).filter((i) => i.slug !== NO_CHEESE_SLUG),
    ...(composition.toppings ?? []),
    ...(composition.condiments ?? []),
    ...(composition['chefs-special'] ?? []),
    ...(composition.bread ?? []),
  ]
    .map((i) => i.name)
    .join(' · ')

const renderCard = (name: string, ingredients: string): React.ReactElement =>
  React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '1200px',
        height: '630px',
        padding: '80px',
        background: '#FAF8F4',
        fontFamily: 'sans-serif',
      },
    },
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          fontSize: 16,
          fontWeight: 700,
          color: '#C0392B',
          letterSpacing: '0.12em',
        },
      },
      'THE DELICATESSEN OF DESTINY',
    ),
    React.createElement('div', { style: { display: 'flex', flex: 1 } }),
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          fontSize: 72,
          fontWeight: 800,
          color: '#1C1917',
          lineHeight: 1.1,
        },
      },
      name,
    ),
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          marginTop: '20px',
          fontSize: 28,
          color: '#78716C',
        },
      },
      ingredients,
    ),
    React.createElement('div', { style: { display: 'flex', flex: 1 } }),
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          fontSize: 18,
          color: '#A8A29E',
        },
      },
      'Between the Bread',
    ),
  )

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response(null, { status: 405 })
  }

  const url = new URL(req.url)
  const parts = url.pathname.split('/')
  const hash = parts[parts.length - 1] ?? ''

  if (!hash) {
    return new Response(null, { status: 400 })
  }

  try {
    const apiRes = await fetch(`${url.origin}/api/sandwiches/share/${hash}`)
    if (!apiRes.ok) {
      return new Response(null, { status: 404 })
    }

    const body: unknown = await apiRes.json()
    const { name, composition } = (body as { data: ShareData }).data
    const ingredients = buildIngredientList(composition)

    return new ImageResponse(renderCard(name, ingredients), { width: 1200, height: 630 })
  } catch {
    return new Response(null, { status: 500 })
  }
}
