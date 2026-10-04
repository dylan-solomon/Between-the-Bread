import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { accessibilityProblems } from '@/test/accessibility'

describe('accessibilityProblems', () => {
  it('finds a button nobody can name', async () => {
    const { container } = render(<button type="button"><svg /></button>)

    const problems = await accessibilityProblems(container)

    expect(problems.some((problem) => problem.startsWith('button-name'))).toBe(true)
  })

  it('finds nothing wrong with a labelled form', async () => {
    const { container } = render(
      <form>
        <label htmlFor="name">Name</label>
        <input id="name" />
        <button type="submit">Save</button>
      </form>,
    )

    expect(await accessibilityProblems(container)).toEqual([])
  })
})
