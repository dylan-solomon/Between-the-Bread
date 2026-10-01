const WORDS_PER_MINUTE = 200

export const readingTimeMinutes = (body: string): number => {
  const words = body.split(/\s+/).filter((word) => word !== '').length
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}
