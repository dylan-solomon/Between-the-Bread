import { describe, it, expect } from 'vitest'
import { fromDateTimeLocal, postStatus, toDateTimeLocal } from '@/utils/blogPost'

describe('postStatus', () => {
  it('is Draft when the post is not published', () => {
    expect(postStatus({ published: false, published_at: null })).toBe('Draft')
  })

  it('stays Draft even when a publish date has been chosen', () => {
    expect(postStatus({ published: false, published_at: '2020-01-01T00:00:00.000Z' })).toBe('Draft')
  })

  it('is Published once the publish date has passed', () => {
    expect(postStatus({ published: true, published_at: '2020-01-01T00:00:00.000Z' })).toBe('Published')
  })

  it('is Scheduled while the publish date is still ahead', () => {
    expect(postStatus({ published: true, published_at: '2999-01-01T00:00:00.000Z' })).toBe('Scheduled')
  })

  it('treats a published post with no date as Published', () => {
    expect(postStatus({ published: true, published_at: null })).toBe('Published')
  })
})

describe('date and time input helpers', () => {
  it('reads a date typed into the input as local time', () => {
    expect(fromDateTimeLocal('2026-12-01T09:30')).toBe(new Date(2026, 11, 1, 9, 30).toISOString())
  })

  it('shows a stored date in local time for the input', () => {
    expect(toDateTimeLocal(new Date(2026, 11, 1, 9, 30).toISOString())).toBe('2026-12-01T09:30')
  })

  it('round-trips a value', () => {
    expect(toDateTimeLocal(fromDateTimeLocal('2027-03-05T18:45'))).toBe('2027-03-05T18:45')
  })

  it('treats an empty input and a missing date as no date', () => {
    expect(fromDateTimeLocal('')).toBeNull()
    expect(toDateTimeLocal(null)).toBe('')
  })

  it('treats an unreadable value as no date', () => {
    expect(fromDateTimeLocal('not a date')).toBeNull()
  })
})
