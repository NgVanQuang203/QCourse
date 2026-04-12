"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore, ActivityDay } from '@/lib/store';
import { getVNDateStr, formatVNLongDate } from '@/lib/utils/date';
import styles from './profile.module.css';
import {
  User, Lock, LogOut, Activity, Check,
  Trophy, Clock, BookOpen, Loader2
} from 'lucide-react';
import { signOut } from 'next-auth/react';

// ─────────────────────────────────────────────────────────────────────────────
// HEATMAP v3 — flex month chips with exact pixel-span alignment + auto-scroll
// ─────────────────────────────────────────────────────────────────────────────
const CELL = 12;  // cell size px
const GAP  = 3;   // gap px — MUST be identical in month-chip row and week grid

function Heatmap({ activity }: { activity: ActivityDay[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ day: ActivityDay; vx: number; vy: number } | null>(null);
  const today = useMemo(() => getVNDateStr(), []);

  // ── 364 days ending TODAY ────────────────────────────────────────────────
  const { paddedDays, numWeeks, monthBlocks } = useMemo(() => {
    const arr: ActivityDay[] = [];
    const now = new Date();
    // Use VN time reference
    const baseDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);

    for (let i = 363; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      const s = d.toISOString().slice(0, 10);
      arr.push(activity.find(a => a.date === s) ?? { date: s, minutesStudied: 0, cardsStudied: 0, deckIds: [] });
    }
    // Pad start so week begins on Sunday (day 0)
    const startDow = new Date(arr[0].date).getDay(); // 0=Sun … 6=Sat
    const padded = [...Array<null>(startDow).fill(null), ...arr] as (ActivityDay | null)[];
    const nWeeks = Math.ceil(padded.length / 7);

    // ── Month block algorithm (correct) ────────────────────────────────────
    // Rule: Start a NEW block at the week that CONTAINS the 1st of a month.
    // Each week belongs to the month of the EARLIEST non-null real date in it.
    // But if that week contains a 1st-of-month date, it triggers a new block.
    const blocks: { label: string; weekIdx: number; weekCount: number }[] = [];
    let currentMonthKey = '';

    for (let wi = 0; wi < nWeeks; wi++) {
      const slice = padded.slice(wi * 7, wi * 7 + 7);
      
      // Check if this week contains the 1st day of any month
      const hasFirst = slice.some(day => day && day.date.slice(8, 10) === '01');
      // Determine which month this week "belongs" to (first real day)
      const representativeDay = slice.find(Boolean) as ActivityDay | undefined;
      if (!representativeDay) continue;

      const d = new Date(representativeDay.date);
      // If the week contains a 1st, use THAT month as the label
      let monthKey: string;
      let monthNum: number;
      let year: number;

      if (hasFirst) {
        const firstDay = slice.find(day => day && day.date.slice(8, 10) === '01') as ActivityDay;
        const fd = new Date(firstDay.date);
        monthNum = fd.getMonth() + 1;
        year = fd.getFullYear();
        monthKey = `${year}-${fd.getMonth()}`;
      } else {
        monthNum = d.getMonth() + 1;
        year = d.getFullYear();
        monthKey = `${year}-${d.getMonth()}`;
      }

      const label = monthNum === 1 ? `T.1 '${String(year).slice(2)}` : `T.${monthNum}`;

      if (monthKey !== currentMonthKey) {
        blocks.push({ label, weekIdx: wi, weekCount: 1 });
        currentMonthKey = monthKey;
      } else {
        if (blocks.length > 0) blocks[blocks.length - 1].weekCount++;
      }
    }

    return { paddedDays: padded, numWeeks: nWeeks, monthBlocks: blocks };
  }, [activity, today]);

  // Auto-scroll so TODAY is visible at the right edge
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [numWeeks]);

  const getLevel = (m: number) => m === 0 ? 0 : m < 15 ? 1 : m < 30 ? 2 : m < 45 ? 3 : 4;
  const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const DAY_COL_W  = 22;
  const DAY_GAP    = 4;

  // Show tooltip on mouse hover (desktop) or touch (mobile)
  const onEnter = (e: React.MouseEvent, day: ActivityDay) => {
    const r = (e.target as HTMLElement).getBoundingClientRect();
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const clampedX = Math.max(90, Math.min(vw - 90, r.left + r.width / 2));
    setTooltip({ day, vx: clampedX, vy: r.top - 10 });
  };

  const onTouch = (e: React.TouchEvent, day: ActivityDay) => {
    e.preventDefault();
    const r = (e.target as HTMLElement).getBoundingClientRect();
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const clampedX = Math.max(90, Math.min(vw - 90, r.left + r.width / 2));
    setTooltip({ day, vx: clampedX, vy: r.top - 10 });
    // Auto-dismiss on mobile after 2s
    setTimeout(() => setTooltip(null), 2000);
  };

  const fmtDate = (s: string) => formatVNLongDate(s);

  return (
    <div className={styles.heatmapWrap}>
      {/* Scrollable container — scrolls to show today on right */}
      <div className={styles.heatmapScroll} ref={scrollRef}>

        {/* ── MONTH CHIP ROW ─────────────────────────────────────────────
            flex gap = GAP (3px) = same as week-grid gap → chips align perfectly
            chip width = N×CELL + (N-1)×GAP = exact pixel width of N columns
        */}
        <div
          className={styles.hmMonthRow}
          style={{ paddingLeft: DAY_COL_W + DAY_GAP, gap: GAP }}
        >
          {monthBlocks.map((b, i) => {
            const chipW = b.weekCount * CELL + (b.weekCount - 1) * GAP;
            return (
              <div
                key={i}
                className={`${styles.hmChip} ${i % 2 === 0 ? styles.hmChipA : styles.hmChipB}`}
                style={{ width: chipW, minWidth: chipW }}
              >
                {b.label}
              </div>
            );
          })}
        </div>

        {/* ── GRID BODY ──────────────────────────────────────────────── */}
        <div className={styles.hmBody} style={{ gap: DAY_GAP }}>
          {/* Day-of-week labels */}
          <div className={styles.hmDayCol} style={{ width: DAY_COL_W }}>
            {DAY_LABELS.map((d, i) => (
              <div key={i} className={styles.hmDayLabel}>{i % 2 === 1 ? d : ''}</div>
            ))}
          </div>

          {/* Week columns — gap = GAP (3px), matches month chip gap */}
          <div className={styles.hmWeekRow} style={{ gap: GAP }}>
            {Array.from({ length: numWeeks }, (_, wi) => (
              <div key={wi} className={styles.hmWeek}>
                {Array.from({ length: 7 }, (_, di) => {
                  const day = paddedDays[wi * 7 + di] ?? null;
                  if (!day) return <div key={di} className={styles.hmCellPad} />;
                  const lv  = getLevel(day.minutesStudied);
                  const isTd = day.date === today;
                  return (
                    <div
                      key={di}
                      className={`${styles.hmCell} ${styles[`lv${lv}`]} ${isTd ? styles.hmToday : ''}`}
                      onMouseEnter={e => onEnter(e, day)}
                      onMouseLeave={() => setTooltip(null)}
                      onTouchStart={e => onTouch(e, day)}
                      onTouchEnd={() => {}} /* prevent ghost click on mobile */
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.heatmapLegend}>
        <span className={styles.legendLabel}>Ít</span>
        {[0,1,2,3,4].map(l => <div key={l} className={`${styles.legendCell} ${styles[`lv${l}`]}`} />)}
        <span className={styles.legendLabel}>Nhiều</span>
      </div>

      {/* Tooltip — fixed position with viewport clamping */}
      {tooltip && (
        <div
          className={styles.heatmapTooltip}
          style={{ 
            position: 'fixed', 
            left: tooltip.vx, 
            top: tooltip.vy, 
            transform: 'translate(-50%,-100%)', 
            zIndex: 9999,
          }}
        >
          <div className={styles.htDate}>{fmtDate(tooltip.day.date)}</div>
          {tooltip.day.minutesStudied > 0 ? (
            <>
              <div className={styles.htStats}>
                <span className={styles.htStat}><Clock size={11} /> {tooltip.day.minutesStudied} phút</span>
                <span className={styles.htStat}><BookOpen size={11} /> {tooltip.day.cardsStudied} thẻ</span>
              </div>
              {tooltip.day.deckIds.length > 0 && <div className={styles.htDecks}>📚 {tooltip.day.deckIds.length} bộ bài</div>}
            </>
          ) : (
            <div className={styles.htEmpty}>Không có hoạt động</div>
          )}
        </div>
      )}
    </div>
  );
}




// ─────────────────────────────────────────────────────────────────────────────
// LEARNING CHART — both axes always visible, tooltip for detail
// ─────────────────────────────────────────────────────────────────────────────
function LearningChart({ activity }: { activity: ActivityDay[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const today = new Date();
  const last30 = useMemo(() => {
    const arr: ActivityDay[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      const vnD = new Date(d.getTime() + 7 * 60 * 60 * 1000);
      vnD.setDate(vnD.getDate() - i);
      const s = vnD.toISOString().slice(0, 10);
      arr.push(activity.find(a => a.date === s) ?? { date: s, minutesStudied: 0, cardsStudied: 0, deckIds: [] });
    }
    return arr;
  }, [activity]);

  const maxMins = Math.max(...last30.map(d => d.minutesStudied), 1);
  // Round up to nice tick values: 15, 30, 45, 60, 90, 120...
  const tick = maxMins <= 30 ? 10 : maxMins <= 60 ? 15 : maxMins <= 120 ? 30 : 60;
  const yMax = Math.ceil(maxMins / tick) * tick;
  const yTicks = Array.from({ length: Math.ceil(yMax / tick) + 1 }, (_, i) => i * tick).reverse();

  const fmtDate = (s: string) => {
    const d = new Date(s);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  // X-axis labels: show every 5th day + today
  const xLabels = last30.map((d, i) => {
    if (i === 29) return { i, label: 'Hôm nay' };
    if (i % 5 === 0) return { i, label: fmtDate(d.date) };
    return null;
  }).filter(Boolean) as { i: number; label: string }[];

  return (
    <div className={styles.chartWrap2}>
      {/* Y-axis */}
      <div className={styles.chartYAxis}>
        {yTicks.map(t => (
          <div key={t} className={styles.chartYTick}>
            <span className={styles.chartYLabel}>{t}p</span>
            <div className={styles.chartYLine} />
          </div>
        ))}
      </div>

      {/* Bars + X-axis */}
      <div className={styles.chartRight}>
        <div className={styles.chartBars2} style={{ height: 140 }}>
          {last30.map((day, i) => {
            const pct = (day.minutesStudied / yMax) * 100;
            const isToday = i === 29;
            const isEmpty = day.minutesStudied === 0;
            return (
              <div
                key={i}
                className={styles.chartBarCol2}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                {hover === i && (
                  <div className={styles.barTooltip}>
                    <div className={styles.btDate}>{fmtDate(day.date)}</div>
                    <div className={styles.btMins}>{day.minutesStudied} phút · {day.cardsStudied} thẻ</div>
                  </div>
                )}
                <div
                  className={`${styles.chartBar2} ${isToday ? styles.barToday2 : ''} ${isEmpty ? styles.barEmpty2 : ''}`}
                  style={{ height: `${Math.max(pct, isEmpty ? 1 : 3)}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className={styles.chartXAxis}>
          {xLabels.map(({ i, label }) => (
            <span
              key={i}
              className={`${styles.chartXLabel} ${i === 29 ? styles.chartXToday : ''}`}
              style={{ left: `${(i / 29) * 100}%` }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TODAY STATS
// ─────────────────────────────────────────────────────────────────────────────
function TodayTimer({ activity }: { activity: ActivityDay[] }) {
  const todayStr = getVNDateStr();
  const t = activity.find(a => a.date === todayStr);
  const mins = t?.minutesStudied ?? 0;
  const cards = t?.cardsStudied ?? 0;
  return (
    <div className={styles.todayRow}>
      <div className={styles.todayStat}>
        <div className={styles.todayVal}>{String(Math.floor(mins / 60)).padStart(2,'0')}:{String(mins % 60).padStart(2,'0')}</div>
        <div className={styles.todayLabel}>⏱ Thời gian học</div>
      </div>
      <div className={styles.todayDivider} />
      <div className={styles.todayStat}>
        <div className={styles.todayVal}>{cards}</div>
        <div className={styles.todayLabel}>📚 Thẻ đã học</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function getBadge(streak: number) {
  if (streak >= 30) return { icon: '👑', label: 'Grandmaster', color: '#f59e0b' };
  if (streak >= 14) return { icon: '🏆', label: 'Master',      color: '#a855f7' };
  if (streak >= 7)  return { icon: '⭐', label: 'Scholar',     color: '#3b82f6' };
  if (streak >= 3)  return { icon: '🔰', label: 'Learner',     color: '#10b981' };
  return              { icon: '🌱', label: 'Newbie',      color: '#6b7280' };
}

const MOODS = ['😄','😊','😐','😴','🤩','🤔','💪','🧠'];
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #a855f7)',
  'linear-gradient(135deg, #10b981, #3b82f6)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #ec4899, #8b5cf6)',
  'linear-gradient(135deg, #06b6d4, #6366f1)',
  'linear-gradient(135deg, #f97316, #eab308)',
  'linear-gradient(135deg, #14b8a6, #0ea5e9)',
  'linear-gradient(135deg, #e11d48, #9333ea)',
];

type Tab = 'profile' | 'activity' | 'password';
const TABS_ALL: { id: Tab; icon: string; label: string }[] = [
  { id: 'profile',  icon: '👤', label: 'Thông tin'  },
  { id: 'activity', icon: '📊', label: 'Hoạt động'  },
  { id: 'password', icon: '🔐', label: 'Mật khẩu'   },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ProfilePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile, streak, maxStreak, activity, isLoading, updateProfile } = useStore();

  const [tab, setTab] = useState<Tab>('profile');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ 
    name: '', 
    nickname: '', 
    bio: '', 
    avatarColor: '', 
    mood: '' 
  });
  const [saved, setSaved] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState('');
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => { if (searchParams.get('tab') === 'settings') setTab('password'); }, [searchParams]);
  
  useEffect(() => { 
    if (profile) {
      setForm({ 
        name: profile.name || '', 
        nickname: profile.nickname || '', 
        bio: profile.bio || '', 
        avatarColor: profile.avatarColor || 'linear-gradient(135deg, #6366f1, #a855f7)', 
        mood: profile.mood || '😊' 
      }); 
    }
  }, [profile]);

  if (isLoading || !profile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - var(--nav-height))', gap: '1.5rem' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: '1rem', fontWeight: 600, opacity: 0.5 }}>Đang tải hồ sơ...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const badge = getBadge(streak);

  const handleSave = async () => { 
    if (isLoading) return;
    const ok = await updateProfile(form as any); 
    if (ok) {
      setEditing(false); 
      setSaved(true); 
      setTimeout(() => setSaved(false), 2000); 
    }
  };

  const pwStrength = (p: string) => {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const strength = pwStrength(pw.next);

  return (
    <div className={styles.page}>

      {/* ── COMPACT PROFILE HEADER ── */}
      <div className={styles.profileHeader}>
        <div className={styles.profileHeaderInner}>
          <div className={styles.avatarWrap}>
            <div className={styles.avatarCircle} style={{ background: profile.avatarColor }}>
              {(profile.name || 'Q').slice(0, 2).toUpperCase()}
            </div>
            <div className={styles.moodBadge}>{profile.mood}</div>
          </div>
          <div className={styles.profileHeaderInfo}>
            <div className={styles.profileName}>{profile.name}</div>
            <div className={styles.profileHandle}>@{profile.nickname}</div>
            <div className={styles.profileBio}>{profile.bio}</div>
            <div className={styles.badgeRow}>
              <div className={styles.userBadge} style={{ borderColor: badge.color, color: badge.color }}>
                {badge.icon} {badge.label}
              </div>
              <div className={styles.streakBadge}>
                <svg width="13" height="13" viewBox="0 0 24 24">
                  <defs><linearGradient id="sb" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#38bdf8"/>
                  </linearGradient></defs>
                  <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="url(#sb)"/>
                </svg>
                {streak} ngày streak
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div className={styles.body}>

        {/* Sidebar — desktop: vertical sticky menu, mobile: horizontal pill scroll */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarInner}>
            {TABS_ALL.map(t => {
              return (
                <button
                  key={t.id}
                  className={`${styles.sidebarItem} ${tab === t.id ? styles.sidebarActive : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  <span className={styles.sidebarIcon}>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              );
            })}
            <div className={styles.sidebarDivider} />
            <button className={`${styles.sidebarItem} ${styles.sidebarLogout}`} onClick={() => setShowLogout(true)}>
              <span className={styles.sidebarIcon}>🚪</span>
              <span>Đăng xuất</span>
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className={styles.content}>

          {/* ── PROFILE TAB ── */}
          {tab === 'profile' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Thông tin cá nhân</h2>
                {!editing
                  ? <button type="button" className={styles.editBtn} onClick={() => setEditing(true)}>✏️ Chỉnh sửa</button>
                  : <div className={styles.editBtns}>
                      <button type="button" className={styles.cancelBtn} onClick={() => { setEditing(false); setForm({...profile}); }}>✕ Huỷ</button>
                      <button type="button" className={styles.saveBtn} onClick={handleSave}><Check size={14}/> Lưu</button>
                    </div>
                }
              </div>

              {saved && <div className={styles.savedAlert}><Check size={15}/> Thông tin đã lưu thành công! 🎉</div>}

              <div className={styles.formSection}>
                <label className={styles.formLabel}>Màu avatar</label>
                <div className={styles.avatarPickGrid}>
                  {AVATAR_GRADIENTS.map((g, i) => (
                    <button key={i} disabled={!editing}
                      className={`${styles.avatarPickItem} ${form.avatarColor === g ? styles.avatarPickActive : ''}`}
                      style={{ background: g }}
                      onClick={() => editing && setForm(f => ({...f, avatarColor: g}))}>
                      {form.avatarColor === g && <Check size={13} color="white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formSection}>
                <label className={styles.formLabel}>Mood hôm nay</label>
                <div className={styles.moodGrid}>
                  {MOODS.map(m => (
                    <button key={m} disabled={!editing}
                      className={`${styles.moodBtn} ${form.mood === m ? styles.moodActive : ''}`}
                      onClick={() => editing && setForm(f => ({...f, mood: m}))}>{m}</button>
                  ))}
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Họ và tên</label>
                  <input className={styles.formInput} disabled={!editing} value={form.name}
                    onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Nguyễn Văn A"/>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nickname</label>
                  <div className={styles.inputPrefix}>
                    <span>@</span>
                    <input className={styles.formInput} disabled={!editing} value={form.nickname}
                      onChange={e => setForm(f => ({...f, nickname: e.target.value.toLowerCase().replace(/\s/g,'')}))} placeholder="nickname"/>
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Giới thiệu <span className={styles.charCount}>{form.bio.length}/150</span>
                </label>
                <textarea className={styles.formTextarea} rows={3} disabled={!editing} value={form.bio}
                  onChange={e => setForm(f => ({...f, bio: e.target.value.slice(0,150)}))} placeholder="Vài dòng về bạn..."/>
              </div>
            </div>
          )}

          {/* ── ACTIVITY TAB ── */}
          {tab === 'activity' && (
            <div className={styles.activityPage}>
              {/* Stat cards */}
              <div className={styles.statsGrid}>
                {[
                  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/></svg>, bg: 'linear-gradient(135deg,#7c3aed,#38bdf8)', val: streak,   label: 'Streak hiện tại' },
                  { icon: <Trophy size={20} color="white"/>,   bg: 'linear-gradient(135deg,#f59e0b,#ef4444)', val: (profile as any)?.quizStats?.maxScore || 0, label: 'Điểm cao nhất' },
                  { icon: <BookOpen size={20} color="white"/>, bg: 'linear-gradient(135deg,#10b981,#3b82f6)', val: activity.reduce((s,a) => s+a.cardsStudied, 0), label: 'Tổng thẻ học' },
                  { icon: <Clock size={20} color="white"/>,    bg: 'linear-gradient(135deg,#6366f1,#a855f7)', val: (profile as any)?.quizStats?.totalAttempts || 0, label: 'Số lần thi' },
                ].map((s,i) => (
                  <div key={i} className={styles.statCard}>
                    <div className={styles.statCardIcon} style={{ background: s.bg }}>{s.icon}</div>
                    <div className={styles.statCardVal}>{s.val}</div>
                    <div className={styles.statCardLabel}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Today */}
              <div className={styles.card}>
                <h3 className={styles.sectionTitle}>⏱ Hôm nay</h3>
                <TodayTimer activity={activity} />
              </div>

              {/* Heatmap */}
              <div className={styles.card}>
                <h3 className={styles.sectionTitle}>🗓️ Lịch sử học tập — 52 tuần</h3>
                <p className={styles.sectionDesc}>Hover vào ô để xem chi tiết · Màu càng đậm = học càng nhiều</p>
                <Heatmap activity={activity} />
              </div>

              {/* Chart */}
              <div className={styles.card}>
                <h3 className={styles.sectionTitle}>📊 Thống kê 30 ngày gần nhất</h3>
                <LearningChart activity={activity} />
              </div>
            </div>
          )}

          {/* ── PASSWORD TAB ── */}
          {tab === 'password' && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                {profile?.hasPassword ? '🔐 Đổi mật khẩu' : '🔐 Thiết lập mật khẩu'}
              </h2>
              <p className={styles.cardSubtitle}>
                {profile?.hasPassword 
                  ? 'Mật khẩu mới phải đủ mạnh và khác mật khẩu hiện tại.'
                  : 'Tài khoản của bạn chưa có mật khẩu (đăng nhập qua Google). Hãy thiết lập mật khẩu để đăng nhập trực tiếp.'}
              </p>

              {pwSaved && <div className={styles.savedAlert}><Check size={15}/> Đổi mật khẩu thành công!</div>}

              {(profile?.hasPassword 
                ? ['Mật khẩu hiện tại','Mật khẩu mới','Xác nhận mật khẩu mới'] 
                : ['Mật khẩu mới','Xác nhận mật khẩu mới']
              ).map((label, idx) => {
                const isFirstTime = !profile?.hasPassword;
                const fieldMap = isFirstTime ? ['next', 'confirm'] : ['current', 'next', 'confirm'];
                const key = fieldMap[idx] as 'current'|'next'|'confirm';
                
                return (
                  <div key={idx} className={styles.formGroup}>
                    <label className={styles.formLabel}>{label}</label>
                    <input className={`${styles.formInput} ${key === 'confirm' && pw.confirm && pw.confirm !== pw.next ? styles.inputError : ''}`}
                      type="password" value={pw[key]} placeholder="••••••••"
                      onChange={e => setPw(p => ({...p, [key]: e.target.value}))} />
                    {key === 'next' && pw.next && (
                      <div className={styles.pwStrength}>
                        <div className={styles.pwBar}>
                          {[1,2,3,4].map(n => <div key={n} className={`${styles.pwSegment} ${n <= strength ? styles[`str${strength}`] : ''}`}/>)}
                        </div>
                        <span className={styles.pwLabel}>{['','Yếu','Trung bình','Tốt','Mạnh'][strength]}</span>
                      </div>
                    )}
                    {key === 'confirm' && pw.confirm && pw.confirm !== pw.next &&
                      <span className={styles.errorMsg}>Mật khẩu không khớp</span>}
                  </div>
                );
              })}
              <button type="button" className={styles.saveBtn} style={{ marginTop: '0.5rem' }}
                disabled={(profile?.hasPassword && !pw.current) || !pw.next || pw.next !== pw.confirm || strength < 2}
                onClick={async () => {
                  try {
                    setPwError('');
                    const res = await fetch('/api/user/change-password', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
                    });
                    const data = await res.json();
                    if (data.error) {
                      setPwError(data.error);
                    } else {
                      setPwSaved(true);
                      setPw({current:'',next:'',confirm:''});
                      setTimeout(() => setPwSaved(false), 3000);
                    }
                  } catch (err) {
                    setPwError('Lỗi kết nối server');
                  }
                }}>
                <Lock size={14}/> Đổi mật khẩu
              </button>
              {pwError && <div className={styles.errorMsg} style={{ marginTop: '0.5rem' }}>{pwError}</div>}
            </div>
          )}

        </main>
      </div>

      {/* Logout modal */}
      {showLogout && (
        <div className={styles.modalOverlay} onClick={() => setShowLogout(false)}>
          <div className={styles.logoutModal} onClick={e => e.stopPropagation()}>
            <div className={styles.logoutIcon}>🚪</div>
            <h3 className={styles.logoutTitle}>Đăng xuất?</h3>
            <p className={styles.logoutDesc}>Bạn có chắc muốn đăng xuất khỏi Q-Card không?</p>
            <div className={styles.logoutBtns}>
              <button className={styles.cancelBtnLg} onClick={() => setShowLogout(false)}>Ở lại</button>
              <button className={styles.dangerBtnLg} onClick={() => signOut({ callbackUrl: '/' })}>Đăng xuất</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
