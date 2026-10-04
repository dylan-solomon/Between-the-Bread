import { describe, it, expect } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useDialogFocus } from '@/hooks/useDialogFocus'

function Dialog({ onClose, withButtons = true }: { onClose: () => void; withButtons?: boolean }) {
  const dialogRef = useDialogFocus<HTMLDivElement>()
  return (
    <div ref={dialogRef} role="dialog" aria-label="Example">
      {withButtons ? (
        <>
          <input aria-label="First field" />
          <button type="button" disabled>Disabled</button>
          <button type="button" onClick={onClose}>Close</button>
        </>
      ) : (
        <p>Nothing to press</p>
      )}
    </div>
  )
}

function Page({ withButtons }: { withButtons?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => { setOpen(true) }}>Open</button>
      <a href="/elsewhere">Elsewhere</a>
      {open && <Dialog onClose={() => { setOpen(false) }} withButtons={withButtons} />}
    </div>
  )
}

const openDialog = async (withButtons?: boolean) => {
  const user = userEvent.setup()
  render(<Page withButtons={withButtons} />)
  await user.click(screen.getByRole('button', { name: 'Open' }))
  return user
}

describe('useDialogFocus', () => {
  it('moves focus into the pop-up when it opens', async () => {
    await openDialog()

    expect(screen.getByLabelText('First field')).toHaveFocus()
  })

  it('wraps from the last control back to the first with Tab', async () => {
    const user = await openDialog()

    await user.tab()
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
    await user.tab()

    expect(screen.getByLabelText('First field')).toHaveFocus()
  })

  it('wraps from the first control to the last with Shift+Tab', async () => {
    const user = await openDialog()

    await user.tab({ shift: true })

    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
  })

  it('pulls focus back in if it has escaped the pop-up', async () => {
    const user = await openDialog()
    screen.getByRole('link', { name: 'Elsewhere' }).focus()

    await user.tab()

    expect(screen.getByLabelText('First field')).toHaveFocus()
  })

  it('focuses the pop-up itself when it has nothing to press', async () => {
    const user = await openDialog(false)

    expect(screen.getByRole('dialog')).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('dialog')).toHaveFocus()
  })

  it('returns focus to the button that opened it when it closes', async () => {
    const user = await openDialog()

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus()
  })
})
