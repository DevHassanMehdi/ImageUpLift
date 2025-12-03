import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import logo from '../logo.svg'; // ⬅️ adjust to './logo.svg' if Navbar.jsx is in src/

export default function Navbar() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('imageuplift-theme');
    if (stored) return stored;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('imageuplift-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const navLinkClass = ({ isActive }) =>
    `nav-link ${isActive ? 'nav-link-active' : ''}`;

  return (
    <nav className={`nav nav-${theme}`}>
      <div className="nav-inner">
        {/* LEFT: logo + image/uplift */}
        <div className="brand nav-brand">
          <a href="/" className="brand-link">
            <img src={logo} alt="ImageUpLift logo" className="brand-logo" />
            <div className="brand-text">
              <span className="brand-line brand-line-top">image</span>
              <span className="brand-line brand-line-bottom">uplift</span>
            </div>
          </a>
        </div>

        {/* CENTER: Convert / Gallery / Analytics */}
        <div className="nav-links nav-center">
          <NavLink to="/convert" className={navLinkClass}>
            Convert
          </NavLink>
          <NavLink to="/gallery" className={navLinkClass}>
            Gallery
          </NavLink>
          <NavLink to="/analytics" className={navLinkClass}>
            Analytics
          </NavLink>
        </div>

        {/* RIGHT: Day / Night mode toggle (no profile) */}
        <div className="nav-right">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${
              theme === 'light' ? 'dark' : 'light'
            } mode`}
          >
            <span className="theme-toggle-icon" aria-hidden="true">
              {theme === 'light' ? '☀️' : '🌙'}
            </span>

            <div className="theme-toggle-track">
              <div
                className={`theme-toggle-thumb ${
                  theme === 'dark' ? 'theme-toggle-thumb-right' : ''
                }`}
              />
            </div>

            <span className="theme-toggle-label">
              {theme === 'light' ? 'Day' : 'Night'}
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
