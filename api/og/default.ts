import { ImageResponse } from '@vercel/og'
import * as React from 'react'

export const config = { runtime: 'edge' }

const CACHE_CONTROL = 'public, max-age=86400, s-maxage=604800'

const renderCard = (): React.ReactElement =>
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
          fontSize: 96,
          fontWeight: 800,
          color: '#1C1917',
          lineHeight: 1.1,
        },
      },
      'Between the Bread',
    ),
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          marginTop: '24px',
          fontSize: 36,
          color: '#78716C',
        },
      },
      'The random sandwich generator. Roll the dice and build your perfect sandwich.',
    ),
    React.createElement('div', { style: { display: 'flex', flex: 1 } }),
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          fontSize: 22,
          color: '#A8A29E',
        },
      },
      'betweenbread.co',
    ),
  )

export default function handler(req: Request): Response {
  if (req.method !== 'GET') {
    return new Response(null, { status: 405 })
  }

  return new ImageResponse(renderCard(), {
    width: 1200,
    height: 630,
    headers: { 'cache-control': CACHE_CONTROL },
  })
}
