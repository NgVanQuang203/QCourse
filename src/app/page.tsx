"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import styles from './page.module.css';

// Counter component (hook inside component = safe)
function StatCounter({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1600;
    const step = value / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setCount(value); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, value]);

  return (
    <div ref={ref} className={styles.statItem}>
      <div className={styles.statValue}>{count.toLocaleString()}{suffix}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

const stats = [
  { value: 10000, suffix: '+', label: 'Thẻ đã học' },
  { value: 98, suffix: '%', label: 'Tỉ lệ nhớ lâu' },
  { value: 500, suffix: '+', label: 'Bộ bài học' },
  { value: 3, suffix: 'x', label: 'Nhanh hơn trung bình' },
];

const steps = [
  { icon: '📚', step: '01', title: 'Chọn bộ bài', desc: 'Tìm hoặc tạo bộ thẻ học phù hợp với nhu cầu của bạn.' },
  { icon: '🧠', step: '02', title: 'Luyện Flashcard', desc: 'Hệ thống SM-2 tự động điều chỉnh lịch ôn tập theo mức độ nhớ.' },
  { icon: '🎯', step: '03', title: 'Kiểm tra kiến thức', desc: 'Làm trắc nghiệm có đồng hồ để xem mình đã tiến bộ bao nhiêu.' },
  { icon: '📈', step: '04', title: 'Theo dõi tiến độ', desc: 'Xem biểu đồ và thống kê chi tiết để tối ưu việc học của bạn.' },
];

// Decorative floating vocabulary cards
const floatingCards = [
  { text: 'useEffect()', angle: -15, x: '5%',  y: '18%', delay: 0    },
  { text: 'Virtual DOM',angle:   8, x: '76%', y: '12%', delay: 0.35  },
  { text: 'HTTP 200',   angle:  -5, x: '83%', y: '55%', delay: 0.8   },
  { text: 'SQL JOIN',   angle:  12, x: '2%',  y: '62%', delay: 0.5   },
  { text: 'O(n log n)', angle: -10, x: '58%', y: '78%', delay: 1.1   },
  { text: 'REST API',   angle:   6, x: '18%', y: '82%', delay: 0.2   },
];

export default function Home() {
  const router = useRouter();

  return (
    <div>
      {/* ── HERO ── */}
      <section className={styles.homeHero}>
        <div className={styles.homeOrb} />

        {/* Floating vocabulary deco cards */}
        {floatingCards.map((card, i) => (
          <motion.div
            key={i}
            className={styles.floatingCard}
            style={{ left: card.x, top: card.y, rotate: card.angle }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.55, y: [0, -10, 0] }}
            transition={{
              opacity: { duration: 0.7, delay: card.delay },
              y: { duration: 4 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: card.delay },
            }}
          >
            {card.text}
          </motion.div>
        ))}

        <motion.div
          className={styles.homeHeroContent}
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Pill badge */}
          <motion.div
            className={styles.heroBadge}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.08, duration: 0.5 }}
          >
            ✨ Học thông minh với thuật toán SM-2
          </motion.div>

          <h1 className={styles.homeHeadline}>
            <span>Học sâu.<br />Nhớ lâu.<br />Thành tích cao.</span>
          </h1>

          <p className={styles.homeSubtitle}>
            Hệ thống học tập thông minh giúp kiến thức khắc sâu vào não bộ
            theo phương pháp <strong>Spaced Repetition</strong> được khoa học kiểm chứng.
          </p>

          {/* CTA buttons */}
          <motion.div
            className={styles.heroCta}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.52 }}
          >
            <button className={styles.ctaPrimary} onClick={() => router.push('/library/flashcard')}>
              🧠 Bắt đầu học ngay
            </button>
            <button className={styles.ctaSecondary} onClick={() => router.push('/library/quiz')}>
              🎯 Làm thử trắc nghiệm
            </button>
          </motion.div>

          {/* Feature cards */}
          <motion.div
            className={styles.homeCardRow}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44, duration: 0.58 }}
          >
            <div className={styles.homeCard} onClick={() => router.push('/library/flashcard')}>
              <div className={styles.homeCardEmoji}>🧠</div>
              <div className={styles.homeCardTitle}>Luyện Flashcard</div>
              <div className={styles.homeCardDesc}>
                Ôn tập lặp lại ngắt quãng theo thuật toán SM-2 được khoa học kiểm chứng.
              </div>
              <div className={styles.homeCardArrow}>→</div>
            </div>
            <div className={styles.homeCard} onClick={() => router.push('/library/quiz')}>
              <div className={styles.homeCardEmoji}>🎯</div>
              <div className={styles.homeCardTitle}>Làm Trắc nghiệm</div>
              <div className={styles.homeCardDesc}>
                Kiểm tra tổng hợp kiến thức với bộ đề có đồng hồ đếm ngược thực tế.
              </div>
              <div className={styles.homeCardArrow}>→</div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── STATS BAR ── */}
      <section className={styles.statsSection}>
        <div className={styles.statsContainer}>
          {stats.map((s, i) => (
            <StatCounter key={i} value={s.value} suffix={s.suffix} label={s.label} />
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className={styles.howSection}>
        <div className={styles.howContainer}>
          <motion.div
            className={styles.sectionHeader}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <div className={styles.sectionTag}>🚀 Cách hoạt động</div>
            <h2 className={styles.sectionTitle}>Học hiệu quả trong 4 bước đơn giản</h2>
          </motion.div>

          <div className={styles.stepsGrid}>
            {steps.map((s, i) => (
              <motion.div
                key={i}
                className={styles.stepCard}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <div className={styles.stepNum}>{s.step}</div>
                <div className={styles.stepIcon}>{s.icon}</div>
                <div className={styles.stepTitle}>{s.title}</div>
                <div className={styles.stepDesc}>{s.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className={styles.bottomCta}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <div className={styles.bottomCtaEmoji}>🎓</div>
          <h2 className={styles.bottomCtaTitle}>Bắt đầu hành trình học tập ngay hôm nay</h2>
          <p className={styles.bottomCtaSub}>Miễn phí. Không cần cài đặt. Học mọi lúc, mọi nơi.</p>
          <button className={styles.ctaPrimary} onClick={() => router.push('/library/flashcard')}>
            Bắt đầu miễn phí →
          </button>
        </motion.div>
      </section>
    </div>
  );
}
