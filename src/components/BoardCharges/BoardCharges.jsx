import useGameStore from '../../store/useGameStore';
import styles from './BoardCharges.module.css';

// Per-round charges from upgrades and relics: rerolls and free digit swaps.
export default function BoardCharges() {
  const phase = useGameStore((s) => s.phase);
  const rerollsLeft = useGameStore((s) => s.rerollsLeft);
  const freeSwapsLeft = useGameStore((s) => s.freeSwapsLeft);
  const rerollsPerRound = useGameStore((s) => s.runConfig?.rerollsPerRound ?? 0);
  const swapsPerRound = useGameStore((s) => s.runConfig?.freeSwapsPerRound ?? 0);
  const startCharge = useGameStore((s) => s.startCharge);

  if (rerollsPerRound === 0 && swapsPerRound === 0) return null;
  const inRound = phase === 'selecting';

  return (
    <div className={styles.charges}>
      {rerollsPerRound > 0 && (
        <button
          className={styles.charge}
          disabled={!inRound || rerollsLeft === 0}
          onClick={() => startCharge('reroll')}
        >
          Reroll a number ({rerollsLeft}/{rerollsPerRound})
        </button>
      )}
      {swapsPerRound > 0 && (
        <button
          className={styles.charge}
          disabled={!inRound || freeSwapsLeft === 0}
          onClick={() => startCharge('swap')}
        >
          Free digit swap ({freeSwapsLeft}/{swapsPerRound})
        </button>
      )}
    </div>
  );
}
