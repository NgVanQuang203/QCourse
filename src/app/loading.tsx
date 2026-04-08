import styles from './loading.module.css';

export default function Loading() {
  return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingLogo}>🎓</div>
      <div className={styles.loadingSpinner} />
      <p className={styles.loadingText}>
        Đang tải dữ liệu<span className={styles.loadingDots} />
      </p>
    </div>
  );
}
