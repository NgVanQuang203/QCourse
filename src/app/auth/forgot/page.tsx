import styles from '@/app/auth/auth.module.css';
import Link from 'next/link';

export default function ForgotPassword() {
  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h1 className={styles.title}>Quên mật khẩu?</h1>
        <p className={styles.subtitle} style={{ marginBottom: '2rem' }}>
          Tính năng này đang được phát triển. Vui lòng quay lại sau!
        </p>
        <Link href="/auth/login" className={styles.submitBtn} style={{ textDecoration: 'none', textAlign: 'center' }}>
          Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
}
