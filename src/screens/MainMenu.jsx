import useGameStore from '../store/useGameStore';
import { RUN_ROUNDS } from '../store/gameLogic';
import styles from './MainMenu.module.css';

export default function MainMenu() {
  const startRun = useGameStore((s) => s.startRun);
  const startClassic = useGameStore((s) => s.startClassic);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>HiLo</h1>
      <p className={styles.description}>
        Pick two numbers and multiply them. The last two digits score points
        — but the leading digits cost energy. Clear {RUN_ROUNDS} rounds on a
        single energy supply!
      </p>
      <div className={styles.buttons}>
        <button className={styles.playBtn} onClick={startRun}>
          Start Run
        </button>
        <button className={styles.secondaryBtn} onClick={startClassic}>
          Endless Classic
        </button>
      </div>
    </div>
  );
}
