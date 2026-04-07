"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import styles from '../auth.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Vui lòng điền đầy đủ thông tin.'); return; }
    setLoading(true); setError('');
    // TODO: call NextAuth signIn('credentials', {...})
    await new Promise(r => setTimeout(r, 900));
    setLoading(false);
    router.push('/');
  };

  const handleGoogle = () => {
    setLoading(true);
    signIn('google', { callbackUrl: '/' });
  };


  return (
    <div className={styles.page}>
      {/* Left branding panel */}
      <div className={styles.brand}>
        <div className={styles.brandInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🎓</span>
            <span className={styles.logoText}>Q-Card</span>
          </div>
          <h1 className={styles.brandTitle}>Chào mừng trở lại!</h1>
          <p className={styles.brandDesc}>
            Tiếp tục hành trình học tập của bạn. Hơn <strong>10,000+ thẻ kiến thức</strong> đang chờ bạn khám phá.
          </p>
          <div className={styles.brandFeatures}>
            {[
              { icon: '⚡', text: 'Thuật toán SM-2 tối ưu hoá' },
              { icon: '🔥', text: 'Theo dõi streak hàng ngày' },
              { icon: '📊', text: 'Thống kê tiến độ chi tiết' },
              { icon: '🎯', text: 'Trắc nghiệm thích ứng thông minh' },
            ].map((f, i) => (
              <div key={i} className={styles.brandFeatureItem}>
                <span className={styles.brandFeatureIcon}>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
          {/* Decorative blobs */}
          <div className={styles.blob1} />
          <div className={styles.blob2} />
        </div>
      </div>

      {/* Right form panel */}
      <div className={styles.panel}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Đăng nhập</h2>
            <p className={styles.formSubtitle}>Chưa có tài khoản? <Link href="/auth/register" className={styles.switchLink}>Đăng ký miễn phí</Link></p>
          </div>

          {/* Google button */}
          <button className={styles.googleBtn} onClick={handleGoogle} type="button">
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Tiếp tục với Google
          </button>

          <div className={styles.divider}><span>hoặc</span></div>

          {error && <div className={styles.errorAlert}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}>✉️</span>
                <input
                  className={styles.input}
                  type="email"
                  placeholder="ban@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({...f, email: e.target.value}))}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label}>Mật khẩu</label>
                <Link href="/auth/forgot" className={styles.forgotLink}>Quên mật khẩu?</Link>
              </div>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}>🔐</span>
                <input
                  className={styles.input}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({...f, password: e.target.value}))}
                  autoComplete="current-password"
                />
                <button type="button" className={styles.pwToggle} onClick={() => setShowPw(p => !p)}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button className={`${styles.submitBtn} ${loading ? styles.loading : ''}`} type="submit" disabled={loading}>
              {loading ? <span className={styles.spinner}/> : null}
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <p className={styles.tos}>
            Bằng cách đăng nhập, bạn đồng ý với{' '}
            <Link href="/terms" className={styles.tosLink}>Điều khoản dịch vụ</Link> và{' '}
            <Link href="/privacy" className={styles.tosLink}>Chính sách bảo mật</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
