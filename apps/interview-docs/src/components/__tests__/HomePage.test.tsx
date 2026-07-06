import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import HomePage from '../HomePage'

describe('HomePage', () => {
  it('renders hero section', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    expect(screen.getByText('前端知识体系')).toBeInTheDocument()
    expect(screen.getByText('开始学习')).toBeInTheDocument()
    expect(screen.getByText('在 GitHub 查看')).toBeInTheDocument()
  })

  it('renders all feature cards', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    expect(screen.getByText('S1 基础夯实')).toBeInTheDocument()
    expect(screen.getByText('S2 框架深入')).toBeInTheDocument()
    expect(screen.getByText('S3 进阶提升')).toBeInTheDocument()
    expect(screen.getByText('S4 面试冲刺')).toBeInTheDocument()
    expect(screen.getByText('S5 AI 前沿')).toBeInTheDocument()
    expect(screen.getByText('S6 Go 语言')).toBeInTheDocument()
  })

  it('feature cards link to correct paths', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    const featuresSection = document.querySelector('.features')
    const featureLinks = featuresSection ? within(featuresSection as HTMLElement).getAllByRole('link') : []
    expect(featureLinks).toHaveLength(6)
    const hrefs = featureLinks.map((l) => l.getAttribute('href'))
    expect(hrefs).toEqual(
      expect.arrayContaining(['/S1-基础夯实/', '/S2-框架深入/', '/S3-进阶提升/', '/S4-面试冲刺/', '/S5-AI/', '/S6-Go/']),
    )
  })

  it('renders motto section', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    expect(screen.getByText('最佳跳槽时机 = 你不需要跳槽的时候')).toBeInTheDocument()
    expect(screen.getByText('保持可被雇佣')).toBeInTheDocument()
    expect(screen.getByText('离职者心态打工')).toBeInTheDocument()
    expect(screen.getByText('入职第一天就布局未来')).toBeInTheDocument()
  })

  it('renders GitHub link with correct href', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    const githubLink = screen.getByText('在 GitHub 查看').closest('a')
    expect(githubLink).toHaveAttribute('href', 'https://github.com/KMaybe01/common')
    expect(githubLink).toHaveAttribute('target', '_blank')
  })
})
