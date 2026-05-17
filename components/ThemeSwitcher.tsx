'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme, THEMES, ThemeName } from './ThemeProvider';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = THEMES.find(t => t.id === theme) || THEMES[0];

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          background: open ? 'hsla(0, 0%, 100%, 0.05)' : 'transparent',
          border: 'none',
          borderRadius: 'var(--sl-radius-md)',
          color: 'var(--sl-text-dim)',
          fontSize: '0.875rem',
          fontWeight: 600,
          fontFamily: 'var(--sl-font-main)',
          cursor: 'pointer',
          transition: 'all 0.25s ease',
        }}
      >
        {/* Palette SVG icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--sl-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="13.5" cy="6.5" r="0.5" fill="var(--sl-red)" stroke="var(--sl-red)" />
          <circle cx="17.5" cy="10.5" r="0.5" fill="var(--sl-green)" stroke="var(--sl-green)" />
          <circle cx="8.5" cy="7.5" r="0.5" fill="var(--sl-gold)" stroke="var(--sl-gold)" />
          <circle cx="6.5" cy="12.5" r="0.5" fill="var(--sl-purple)" stroke="var(--sl-purple)" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
        </svg>
        <span style={{ flex: 1, textAlign: 'left' }}>Theme</span>
        {/* Mini swatch preview */}
        <div style={{ display: 'flex', gap: '3px' }}>
          {current.colors.slice(1, 4).map((c, i) => (
            <div
              key={i}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: c,
                boxShadow: `0 0 4px ${c}40`,
              }}
            />
          ))}
        </div>
      </button>

      {/* Popover */}
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '0',
            right: '0',
            background: 'var(--sl-bg-sub)',
            border: '1px solid var(--sl-glass-border)',
            borderRadius: 'var(--sl-radius-lg)',
            padding: '8px',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.65), 0 0 1px rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 999,
            animation: 'modal-in 0.3s var(--sl-ease-out)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--sl-font-display)',
              fontSize: '0.6rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'var(--sl-text-ghost)',
              padding: '8px 12px 12px',
            }}
          >
            Select Theme
          </div>

          {THEMES.map((t) => {
            const isActive = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id as ThemeName);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  background: isActive ? 'var(--sl-blue-dim)' : 'transparent',
                  border: isActive ? '1px solid var(--sl-glass-border-bright)' : '1px solid transparent',
                  borderRadius: 'var(--sl-radius-md)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '4px',
                  fontFamily: 'var(--sl-font-main)',
                }}
                onMouseOver={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'hsla(0,0%,100%,0.04)';
                }}
                onMouseOut={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                {/* Color preview strip */}
                <div
                  style={{
                    display: 'flex',
                    gap: '3px',
                    padding: '4px 5px',
                    background: t.colors[0],
                    borderRadius: '8px',
                    border: '1px solid hsla(0,0%,100%,0.06)',
                  }}
                >
                  {t.colors.slice(1).map((c, i) => (
                    <div
                      key={i}
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '4px',
                        background: c,
                        boxShadow: `0 0 6px ${c}30`,
                      }}
                    />
                  ))}
                </div>

                {/* Label */}
                <span
                  style={{
                    flex: 1,
                    textAlign: 'left',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--sl-blue)' : 'var(--sl-text-main)',
                    letterSpacing: '0.3px',
                  }}
                >
                  {t.label}
                </span>

                {/* Active indicator — checkmark SVG */}
                {isActive && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sl-blue)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
