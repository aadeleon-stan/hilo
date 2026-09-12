import useGameStore from '../store/useGameStore';
import styles from './MainMenu.module.css';

export default function MainMenu() {
  const startGame = useGameStore((s) => s.startGame);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>HiLo</h1>
      <p className={styles.description}>
        Pick two numbers and multiply them. The last two digits score points
        — but the leading digits cost energy. Hit the target before your
        energy runs out!
      </p>
      <button className={styles.playBtn} onClick={startGame}>
        Play
      </button>
    </div>
  );
}
