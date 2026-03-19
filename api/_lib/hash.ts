import { nanoid } from 'nanoid'

export const generateHash = (): string => nanoid(8)
