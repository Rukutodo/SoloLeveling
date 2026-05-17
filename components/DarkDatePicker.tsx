import { useState, useRef, useEffect } from 'react';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface DarkDatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (date: string) => void;
}

export default function DarkDatePicker({ value, onChange }: DarkDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial date safely
  const parsedDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [currentMonth, setCurrentMonth] = useState(parsedDate.getMonth());
  const [currentYear, setCurrentYear] = useState(parsedDate.getFullYear());

  // Synchronize state when selected date value changes from outside
  useEffect(() => {
    const d = value ? new Date(value + 'T00:00:00') : new Date();
    setCurrentMonth(d.getMonth());
    setCurrentYear(d.getFullYear());
  }, [value]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format date for display
  const displayDate = parsedDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Calculate calendar days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleDaySelect = (day: number) => {
    const selected = new Date(currentYear, currentMonth, day);
    // Format as YYYY-MM-DD taking care of localized dates
    const yyyy = selected.getFullYear();
    const mm = String(selected.getMonth() + 1).padStart(2, '0');
    const dd = String(selected.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const handleGoToday = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setIsOpen(false);
  };

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', zIndex: 100 }}>
      {/* Date Toggle Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--sl-glass-border)',
          borderRadius: '12px',
          color: '#ffffff',
          padding: '10px 16px',
          fontSize: '0.85rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: isOpen ? '0 0 15px rgba(0, 212, 255, 0.25)' : 'none',
          borderColor: isOpen ? 'var(--sl-blue)' : 'var(--sl-glass-border)',
        }}
      >
        <FaCalendarAlt style={{ color: 'var(--sl-blue)', fontSize: '0.9rem' }} />
        <span>{displayDate}</span>
      </button>

      {/* Custom Dark Mode Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            background: 'var(--sl-bg-sub, #0b0f19)',
            border: '1px solid var(--sl-glass-border)',
            borderRadius: '16px',
            padding: '16px',
            width: '280px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 212, 255, 0.15)',
            zIndex: 9999,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--sl-text-ghost)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
            >
              <FaChevronLeft />
            </button>
            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--sl-text-ghost)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
            >
              <FaChevronRight />
            </button>
          </div>

          {/* Weekday labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
            {weekDays.map(wd => (
              <span key={wd} style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--sl-text-ghost)', textTransform: 'uppercase' }}>
                {wd}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
            {/* Blanks */}
            {blanksArray.map(b => (
              <div key={`blank-${b}`} />
            ))}
            {/* Days */}
            {daysArray.map(day => {
              const isSelected = parsedDate.getDate() === day && parsedDate.getMonth() === currentMonth && parsedDate.getFullYear() === currentYear;
              const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth && new Date().getFullYear() === currentYear;

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => handleDaySelect(day)}
                  style={{
                    background: isSelected ? 'var(--sl-blue)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: isSelected ? '#ffffff' : isToday ? 'var(--sl-blue)' : 'var(--sl-text-bright, #ffffff)',
                    fontSize: '0.75rem',
                    fontWeight: isSelected || isToday ? 800 : 500,
                    padding: '8px 0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 0 10px rgba(0, 212, 255, 0.3)' : 'none',
                  }}
                  onMouseOver={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', marginTop: '12px', paddingTop: '12px', textAlign: 'right' }}>
            <button
              type="button"
              onClick={handleGoToday}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--sl-blue)',
                fontSize: '0.7rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                cursor: 'pointer',
              }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
