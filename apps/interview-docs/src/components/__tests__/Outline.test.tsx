import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Outline from '../Outline';

describe('Outline', () => {
  const headings = [
    { level: 1, text: 'Title' },
    { level: 2, text: 'Section 1' },
    { level: 3, text: 'Sub Section' },
    { level: 2, text: 'Section 2' },
  ];

  it('renders all headings', () => {
    render(<Outline headings={headings} />);
    expect(screen.getByText('目录')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Section 1')).toBeInTheDocument();
    expect(screen.getByText('Sub Section')).toBeInTheDocument();
    expect(screen.getByText('Section 2')).toBeInTheDocument();
  });

  it('renders correct number of links', () => {
    render(<Outline headings={headings} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
  });

  it('sets correct href for each heading', () => {
    render(<Outline headings={headings} />);
    expect(screen.getByText('Title').closest('a')).toHaveAttribute('href', '#title');
    expect(screen.getByText('Section 1').closest('a')).toHaveAttribute('href', '#section-1');
    expect(screen.getByText('Sub Section').closest('a')).toHaveAttribute('href', '#sub-section');
    expect(screen.getByText('Section 2').closest('a')).toHaveAttribute('href', '#section-2');
  });

  it('applies correct padding based on heading level', () => {
    render(<Outline headings={headings} />);
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveStyle('padding-left: 0px');
    expect(links[1]).toHaveStyle('padding-left: 12px');
    expect(links[2]).toHaveStyle('padding-left: 24px');
    expect(links[3]).toHaveStyle('padding-left: 12px');
  });

  it('marks the heading matched by activeId as active', () => {
    render(<Outline headings={headings} activeId="section-1" />);
    expect(screen.getByText('Section 1').closest('a')).toHaveClass('outline-item--active');
    expect(screen.getByText('Section 2').closest('a')).not.toHaveClass('outline-item--active');
  });

  it('notifies the parent with the slugified id on click', async () => {
    const onSelect = vi.fn();
    render(<Outline headings={headings} activeId="title" onSelect={onSelect} />);
    await userEvent.click(screen.getByText('Section 1'));
    expect(onSelect).toHaveBeenCalledWith('section-1');
  });

  it('returns null when headings array is empty', () => {
    const { container } = render(<Outline headings={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
