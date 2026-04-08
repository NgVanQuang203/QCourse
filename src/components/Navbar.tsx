// src/components/Navbar.tsx
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { LogOut, User, Settings, LogIn } from 'lucide-react';
import styles from './navbar.module.css';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { signIn, signOut, useSession } from 'next-auth/react';

// ── Custom Streak Icon (Lightning bolt — unique to Q-Card) ──
function StreakIcon({ streak }: { streak: number }) {
  const [showTip, setShowTip] = useState(false);
  const hot = streak >= 7;
  const fire = streak >= 3;

  return (
    <div
      className={`${styles.streakChip} ${hot ? styles.streakHot : fire ? styles.streakFire : ''}`}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <svg className={styles.streakIcon} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="bolt-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <path
          d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"
          fill="url(#bolt-grad)"
          stroke="none"
        />
      </svg>
      <span className={styles.streakNum}>{streak}</span>

      {showTip && (
        <div className={styles.streakTooltip}>
          <div className={styles.tooltipTitle}>⚡ Streak {streak} ngày</div>
          <div className={styles.tooltipSub}>
            {streak === 0 ? 'Học hôm nay để bắt đầu streak!' :
             streak < 3 ? 'Tiếp tục duy trì nhịp học!' :
             streak < 7 ? '🔥 Đang có đà tốt!' :
             '🏆 Streak siêu khủng! Tiếp tục đi!'}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { streak, profile } = useStore();

  useEffect(() => setMounted(true), []);
  useEffect(() => setIsMobileOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  const toggleTheme = (e?: React.MouseEvent) => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    if (!document.startViewTransition || !e) { setTheme(nextTheme); return; }
    const x = e.clientX, y = e.clientY;
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = document.startViewTransition(() => setTheme(nextTheme));
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
        { duration: 450, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
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

  const initials = profile?.name ? profile.name.slice(0, 2).toUpperCase() : '??';

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.container}>
          <div className={styles.left}>
            <Link href="/" className={styles.logo} onClick={() => setIsMobileOpen(false)}>
              <span style={{ fontSize: '1.6rem' }}>🎓</span>
              Q-Card
            </Link>
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

          <div className={styles.navActions}>
            {/* Streak chip */}
            {mounted && status === 'authenticated' && <StreakIcon streak={streak} />}

            {/* Theme toggle */}
            {mounted && (
              <button
                className={`${styles.iconBtn} ${styles.themeBtn}`}
                onClick={(e) => toggleTheme(e)}
                title="Chuyển giao diện"
              >
                {resolvedTheme === 'dark' ? '🌞' : '🌙'}
              </button>
            )}

            {/* Account dropdown or Login button */}
            {mounted && (
              (status === 'loading' || (status === 'authenticated' && !profile)) ? (
                <div className={styles.avatarSkeleton} />
              ) : status === 'authenticated' && profile ? (
                <div
                  className={styles.accountWrapper}
                  onMouseEnter={() => setIsDropdownOpen(true)}
                  onMouseLeave={() => setIsDropdownOpen(false)}
                >
                  <button className={styles.avatarBtn} title="Tài khoản" style={{ background: profile.avatarColor }}>
                    {initials}
                  </button>

                  {isDropdownOpen && (
                    <div className={styles.dropdown}>
                      <div className={styles.dropdownHeader}>
                        <div className={styles.dropdownAvatar} style={{ background: profile.avatarColor }}>
                          {initials}
                        </div>
                        <div>
                          <div className={styles.dropdownUsername}>{profile.name}</div>
                          <div className={styles.dropdownEmail}>@{profile.nickname}</div>
                        </div>
                      </div>
                      <div className={styles.dropdownDivider} />
                      <div className={styles.dropdownItem} onClick={() => { router.push('/profile'); setIsDropdownOpen(false); }}>
                        <User size={16} /> Trang cá nhân
                      </div>
                      <div className={styles.dropdownItem} onClick={() => { router.push('/profile?tab=settings'); setIsDropdownOpen(false); }}>
                        <Settings size={16} /> Cài đặt
                      </div>
                      <div className={styles.dropdownDivider} />
                      <div className={`${styles.dropdownItem} ${styles.dangerItem}`} onClick={() => signOut()}>
                        <LogOut size={16} /> Đăng xuất
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button className={styles.loginBtn} onClick={() => signIn()}>
                  <LogIn size={16} /> <span>Đăng nhập</span>
                </button>
              )
            )}

            {/* Mobile hamburger */}
            <button
              className={`${styles.hamburger} ${isMobileOpen ? styles.open : ''}`}
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              aria-label="Menu"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
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
        {status === 'authenticated' && (
          <Link href="/profile" className={`${styles.mobileLink} ${pathname === '/profile' ? styles.active : ''}`}>
            <span className={styles.mobileLinkIcon}>👤</span>
            Trang cá nhân
          </Link>
        )}
        <div className={styles.mobileDivider} />
        <div className={styles.mobileBottom}>
          {mounted && (
            <button className={styles.mobileThemeBtn} onClick={(e) => { toggleTheme(e); setIsMobileOpen(false); }}>
              <span style={{ fontSize: '1.5rem' }}>{resolvedTheme === 'dark' ? '🌞' : '🌙'}</span>
              {resolvedTheme === 'dark' ? 'Chế độ Sáng' : 'Chế độ Tối'}
            </button>
          )}
          {status === 'authenticated' ? (
            <button className={styles.mobileThemeBtn} style={{ color: 'var(--danger)' }} onClick={() => signOut()}>
              <span style={{ fontSize: '1.5rem' }}>🚪</span> Đăng xuất
            </button>
          ) : (
            <button className={styles.mobileThemeBtn} onClick={() => signIn()}>
              <span style={{ fontSize: '1.5rem' }}>🔑</span> Đăng nhập
            </button>
          )}
        </div>
      </div>
    </>
  );
}
