import useGameStore from '../store/useGameStore';
import styles from './MainMenu.module.css';

export default function MainMenu() {
  const startGame = useGameStore((s) => s.startGame);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>HiLo</h1>
      <p className={styles.description}>
        Multiply two-digit numbers. High word earns money, low word scores
        points. Meet the target to advance!
      </p>
      <button className={styles.playBtn} onClick={startGame}>
        Play
      </button>
    </div>
  );
}
