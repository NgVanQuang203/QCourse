"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { LogOut, Info } from 'lucide-react';
import styles from './navbar.module.css';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close mobile menu on route change
  useEffect(() => setIsMobileOpen(false), [pathname]);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  // ── Theme toggle with circular reveal animation ──────────────────
  const toggleTheme = (e?: React.MouseEvent) => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';

    // View Transitions API — only if supported
    if (!document.startViewTransition || !e) {
      setTheme(nextTheme);
      return;
    }

    // Get click origin for the ripple center
    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
      setTheme(nextTheme);
    });

    transition.ready.then(() => {
      // Animate the new view expanding from the click point
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ];
      document.documentElement.animate(
        { clipPath },
        {
          duration: 450,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  };

  const navItems = [
    { href: '/', icon: '🏠', label: 'Trang Chủ', exact: true },
    { href: '/library/flashcard', icon: '🧠', label: 'Flashcard', match: ['/library/flashcard', '/flashcard'] },
    { href: '/library/quiz', icon: '🕹️', label: 'Trắc nghiệm', match: ['/library/quiz', '/quiz'] },
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return pathname === item.href;
    return item.match?.some(m => pathname.startsWith(m)) ?? false;
  };

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.container}>
          <div className={styles.left}>
            <Link href="/" className={styles.logo} onClick={() => setIsMobileOpen(false)}>
              <span style={{ fontSize: '1.6rem' }}>🎓</span>
              Q-Card
            </Link>

            {/* Desktop links */}
            <div className={styles.links}>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.link} ${isActive(item) ? styles.active : ''}`}
                >
                  <span className={styles.linkIcon}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop right actions */}
          <div className={styles.navActions}>
            {mounted && (
              <button
                className={`${styles.iconBtn} ${styles.themeBtn}`}
                onClick={(e) => toggleTheme(e)}
                title="Chuyển giao diện Sáng / Tối"
              >
                {resolvedTheme === 'dark' ? '🌞' : '🌙'}
              </button>
            )}

            <div
              className={styles.accountWrapper}
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <button className={styles.iconBtn} title="Tài khoản">
                🦊
              </button>

              {isDropdownOpen && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownHeader}>
                    <div className={styles.dropdownUsername}>Người dùng</div>
                    <div className={styles.dropdownEmail}>user@qcard.vn</div>
                  </div>
                  <div className={styles.dropdownItem}>
                    <Info size={16} /> Thông tin tài khoản
                  </div>
                  <div className={`${styles.dropdownItem} ${styles.dangerItem}`}>
                    <LogOut size={16} /> Đăng xuất
                  </div>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className={`${styles.hamburger} ${isMobileOpen ? styles.open : ''}`}
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              aria-label="Menu"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile fullscreen drawer */}
      <div className={`${styles.mobileMenu} ${isMobileOpen ? styles.open : ''}`}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.mobileLink} ${isActive(item) ? styles.active : ''}`}
          >
            <span className={styles.mobileLinkIcon}>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <div className={styles.mobileDivider} />

        <div className={styles.mobileBottom}>
          {mounted && (
            <button className={styles.mobileThemeBtn} onClick={(e) => { toggleTheme(e); setIsMobileOpen(false); }}>
              <span style={{ fontSize: '1.5rem' }}>{resolvedTheme === 'dark' ? '🌞' : '🌙'}</span>
              {resolvedTheme === 'dark' ? 'Chế độ Sáng' : 'Chế độ Tối'}
            </button>
          )}
          <button className={styles.mobileThemeBtn} style={{ color: 'var(--foreground)' }}>
            <span style={{ fontSize: '1.5rem' }}>🦊</span>
            Tài khoản của tôi
          </button>
          <button className={styles.mobileThemeBtn} style={{ color: 'var(--danger)' }}>
            <span style={{ fontSize: '1.5rem' }}>🚪</span>
            Đăng xuất
          </button>
        </div>
      </div>
    </>
  );
}
