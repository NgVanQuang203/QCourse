"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import styles from '../auth.module.css';

const pwStrength = (p: string) => {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const strength = pwStrength(form.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError('Vui lòng điền đầy đủ thông tin.'); return; }
    if (form.password !== form.confirm) { setError('Mật khẩu xác nhận không khớp.'); return; }
    if (!agreed) { setError('Bạn cần đồng ý với điều khoản dịch vụ.'); return; }
    setLoading(true); setError('');

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Đăng ký thất bại.');
      setLoading(false);
    } else {
      // Auto login after register
      await signIn('credentials', {
        email: form.email,
        password: form.password,
        callbackUrl: '/',
      });
    }
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
          <h1 className={styles.brandTitle}>Bắt đầu học ngay hôm nay!</h1>
          <p className={styles.brandDesc}>
            Tạo tài khoản miễn phí và trải nghiệm phương pháp học tập khoa học được hàng nghìn người tin dùng.
          </p>

          <div className={styles.socialProof}>
            <div className={styles.avatarStack}>
              {['#6366f1','#10b981','#f59e0b','#ec4899'].map((c,i) => (
                <div key={i} className={styles.stackAvatar} style={{ background: c, marginLeft: i ? '-8px' : 0 }} />
              ))}
            </div>
            <span className={styles.socialProofText}><strong>2,400+</strong> học viên đang dùng Q-Card mỗi ngày</span>
          </div>

          <div className={styles.brandFeatures}>
            {[
              { icon: '🆓', text: 'Miễn phí mãi mãi — không cần thẻ tín dụng' },
              { icon: '🔒', text: 'Bảo mật dữ liệu tuyệt đối' },
              { icon: '📱', text: 'Hoạt động trên mọi thiết bị' },
              { icon: '🤝', text: 'Hỗ trợ 24/7 từ đội ngũ' },
            ].map((f, i) => (
              <div key={i} className={styles.brandFeatureItem}>
                <span className={styles.brandFeatureIcon}>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
          <div className={styles.blob1} />
          <div className={styles.blob2} />
        </div>
      </div>

      {/* Right form panel */}
      <div className={styles.panel}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Tạo tài khoản</h2>
            <p className={styles.formSubtitle}>Đã có tài khoản? <Link href="/auth/login" className={styles.switchLink}>Đăng nhập ngay</Link></p>
          </div>

          <button className={styles.googleBtn} onClick={handleGoogle} type="button">
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Đăng ký với Google
          </button>

          <div className={styles.divider}><span>hoặc điền form bên dưới</span></div>

          {error && <div className={styles.errorAlert}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Họ và tên</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}>👤</span>
                <input className={styles.input} type="text" placeholder="Nguyễn Văn A"
                  value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} autoComplete="name"/>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}>✉️</span>
                <input className={styles.input} type="email" placeholder="ban@example.com"
                  value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} autoComplete="email"/>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Mật khẩu</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}>🔐</span>
                <input className={styles.input} type={showPw ? 'text' : 'password'} placeholder="Tối thiểu 8 ký tự"
                  value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} autoComplete="new-password"/>
                <button type="button" className={styles.pwToggle} onClick={() => setShowPw(p => !p)}>{showPw ? '🙈' : '👁️'}</button>
              </div>
              {form.password && (
                <div className={styles.strengthRow}>
                  <div className={styles.strengthBar}>
                    {[1,2,3,4].map(n => (
                      <div key={n} className={`${styles.strengthSeg} ${n <= strength ? styles[`str${strength}`] : ''}`}/>
                    ))}
                  </div>
                  <span className={styles.strengthLabel}>{['','Yếu','Trung bình','Tốt','Mạnh'][strength]}</span>
                </div>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Xác nhận mật khẩu</label>
              <div className={`${styles.inputWrap} ${form.confirm && form.confirm !== form.password ? styles.inputError : ''}`}>
                <span className={styles.inputIcon}>✅</span>
                <input className={styles.input} type="password" placeholder="Nhập lại mật khẩu"
                  value={form.confirm} onChange={e => setForm(f => ({...f, confirm: e.target.value}))} autoComplete="new-password"/>
              </div>
              {form.confirm && form.confirm !== form.password &&
                <span className={styles.fieldError}>Mật khẩu không khớp</span>}
            </div>

            <label className={styles.checkRow}>
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className={styles.check}/>
              <span>Tôi đồng ý với <Link href="/terms" className={styles.tosLink}>Điều khoản dịch vụ</Link> và <Link href="/privacy" className={styles.tosLink}>Chính sách bảo mật</Link></span>
            </label>

            <button className={`${styles.submitBtn} ${loading ? styles.loading : ''}`} type="submit" disabled={loading || !agreed}>
              {loading ? <span className={styles.spinner}/> : null}
              {loading ? 'Đang tạo tài khoản...' : '🚀 Tạo tài khoản miễn phí'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
