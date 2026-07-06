import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTheme } from '../useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    document.documentElement.className = ''
    localStorage.clear()
  })

  it('returns light theme by default', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
  })

  it('returns dark theme when dark class is present', () => {
    document.documentElement.classList.add('dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
  })

  it('toggles from light to dark', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')

    result.current.toggleTheme()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('toggles from dark to light', () => {
    document.documentElement.classList.add('dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')

    result.current.toggleTheme()

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
  })
})
