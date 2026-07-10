import { motion } from 'motion/react';
import { normalizeHeadingText, slugify } from '../utils/slugify';

interface Heading {
  level: number;
  text: string;
}

export default function Outline({ headings }: { headings: Heading[] }) {
  if (headings.length === 0) return null;

  return (
    <motion.aside
      className="outline"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }}
    >
      <div className="outline-header">目录</div>
      <nav className="outline-list">
        {headings.map((h, i) => (
          <motion.a
            key={`${h.level}-${slugify(h.text)}-${i}`}
            href={`#${slugify(h.text)}`}
            className="outline-item"
            style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: 0.15 + i * 0.04 }}
            whileHover={{ x: 4 }}
            onClick={(e) => {
              e.preventDefault();
              const id = slugify(h.text);
              const el = document.getElementById(id);
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            {normalizeHeadingText(h.text)}
          </motion.a>
        ))}
      </nav>
    </motion.aside>
  );
}
