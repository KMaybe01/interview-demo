import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

vi.mock('./data/content', () => ({
  loadContent: async () => null,
}))
