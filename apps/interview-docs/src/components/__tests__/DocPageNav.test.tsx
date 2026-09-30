import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { DocRef } from '../../data/docSequence';
import DocPageNav from '../DocPageNav';

function renderNav(prev: DocRef | null, next: DocRef | null) {
  return render(
    <MemoryRouter>
      <DocPageNav prev={prev} next={next} />
    </MemoryRouter>,
  );
}

const prevDoc: DocRef = { url: '/S1-基础夯实/01-HTML', title: 'HTML' };
const nextDoc: DocRef = { url: '/S1-基础夯实/02-CSS', title: 'CSS' };

describe('DocPageNav', () => {
  it('renders prev and next links with hrefs and titles', () => {
    renderNav(prevDoc, nextDoc);

    const prevLink = screen.getByRole('link', { name: /上一章节/ });
    expect(prevLink).toHaveAttribute('href', '/S1-基础夯实/01-HTML');
    expect(prevLink).toHaveTextContent('HTML');

    const nextLink = screen.getByRole('link', { name: /下一章节/ });
    expect(nextLink).toHaveAttribute('href', '/S1-基础夯实/02-CSS');
    expect(nextLink).toHaveTextContent('CSS');
  });

  it('shows placeholder when prev is missing', () => {
    renderNav(null, nextDoc);

    expect(screen.getByText('已是第一章')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('shows placeholder when next is missing', () => {
    renderNav(prevDoc, null);

    expect(screen.getByText('已是最后一章')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('renders nothing when both prev and next are missing', () => {
    const { container } = renderNav(null, null);
    expect(container.innerHTML).toBe('');
  });
});
