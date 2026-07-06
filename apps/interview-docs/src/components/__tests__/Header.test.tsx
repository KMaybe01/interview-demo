import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import Header from '../Header'

vi.mock('../GlobalSearch', () => ({
  default: function MockSearch({ onClose }: { onClose: () => void }) {
    return <div data-testid="global-search"><button onClick={onClose} type="button">close</button></div>
  },
}))

describe('Header', () => {
  it('renders logo and title', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    )
    expect(screen.getByText('前端知识体系')).toBeInTheDocument()
    expect(screen.getByAltText('Logo')).toBeInTheDocument()
  })

  it('renders navigation items from config', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    )
    expect(screen.getByText('首页')).toBeInTheDocument()
    expect(screen.getByText('基础夯实')).toBeInTheDocument()
    expect(screen.getByText('框架深入')).toBeInTheDocument()
    expect(screen.getByText('进阶提升')).toBeInTheDocument()
    expect(screen.getByText('面试冲刺')).toBeInTheDocument()
    expect(screen.getByText('AI 前沿')).toBeInTheDocument()
    expect(screen.getByText('Go 语言')).toBeInTheDocument()
  })

  it('toggles mobile menu when hamburger button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    )

    const menuBtn = screen.getByLabelText('菜单')
    const nav = document.querySelector('.header-nav')
    expect(nav).not.toHaveClass('open')

    await user.click(menuBtn)
    expect(nav).toHaveClass('open')

    await user.click(menuBtn)
    expect(nav).not.toHaveClass('open')
  })

  it('opens search modal when search button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    )

    expect(screen.queryByTestId('global-search')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('搜索'))
    expect(screen.getByTestId('global-search')).toBeInTheDocument()
  })

  it('closes search modal when GlobalSearch fires onClose', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    )

    await user.click(screen.getByLabelText('搜索'))
    expect(screen.getByTestId('global-search')).toBeInTheDocument()

    await user.click(screen.getByText('close'))
    expect(screen.queryByTestId('global-search')).not.toBeInTheDocument()
  })

  it('renders theme toggle', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    )
    const toggle = document.querySelector('.theme-switch input[type="checkbox"]')
    expect(toggle).toBeInTheDocument()
  })

  it('renders GitHub link', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    )
    const githubLink = screen.getByTitle('GitHub')
    expect(githubLink).toHaveAttribute('href', 'https://github.com/KMaybe01/common')
    expect(githubLink).toHaveAttribute('target', '_blank')
  })
})
