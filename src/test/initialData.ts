export const sendWithPage = (path: string, data: unknown): void => {
  const script = document.createElement('script')
  script.type = 'application/json'
  script.id = 'initial-data'
  script.textContent = JSON.stringify({ path, data })
  document.body.appendChild(script)
}

export const clearSentData = (): void => {
  document.getElementById('initial-data')?.remove()
}
