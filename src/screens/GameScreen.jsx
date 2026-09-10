import useGameStore from '../store/useGameStore';
import HUD from '../components/HUD/HUD';
import Pool from '../components/Pool/Pool';
import Overlay from '../components/Overlay/Overlay';
import styles from './GameScreen.module.css';

export default function GameScreen() {
  const poolA = useGameStore((s) => s.poolA);
  const poolB = useGameStore((s) => s.poolB);
  const selectedA = useGameStore((s) => s.selectedA);
  const selectedB = useGameStore((s) => s.selectedB);
  const selectFromPoolA = useGameStore((s) => s.selectFromPoolA);
  const selectFromPoolB = useGameStore((s) => s.selectFromPoolB);
  const lastResult = useGameStore((s) => s.lastResult);
  const turn = useGameStore((s) => s.turn);

  return (
    <div className={styles.container}>
      <HUD />

      {lastResult && (
        <div key={turn} className={styles.result}>
          <span className={styles.equation}>
            {lastResult.a} &times; {lastResult.b} = {lastResult.product}
          </span>
          <span className={styles.breakdown}>
            <span className={styles.hi}>+${lastResult.highWord} money</span>
            {' '}
            <span className={styles.lo}>+{lastResult.lowWord} pts</span>
          </span>
        </div>
      )}

      <div className={styles.pools}>
        <Pool
          pool={poolA}
          selectedId={selectedA}
          onSelect={selectFromPoolA}
          label="Pool A"
        />

        <div className={styles.times}>&times;</div>

        <Pool
          pool={poolB}
          selectedId={selectedB}
          onSelect={selectFromPoolB}
          label="Pool B"
        />
      </div>

      <Overlay />
    </div>
  );
}
