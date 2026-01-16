import React from 'react';

// Visually hidden utility
export const SrOnly: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <span style={{
    border: 0,
    clip: 'rect(0 0 0 0)',
    height: '1px',
    margin: '-1px',
    overflow: 'hidden',
    padding: 0,
    position: 'absolute',
    width: '1px',
    whiteSpace: 'nowrap'
  }}>
    {children}
  </span>
);

// Focusable selector used across components
export const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  try {
    const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    // Filter out elements that are not visible
    return nodes.filter((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
    });
  } catch {
    return [];
  }
}


