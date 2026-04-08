import styles from '@/app/loading.module.css';

export default function QuizLoading() {
  return (
    <div className={styles.skeletonContainer}>
      <div className={styles.skeletonHero} />
      <div className={styles.skeletonBar} />
      <div className={styles.skeletonGrid}>
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
      </div>
    </div>
  );
}
