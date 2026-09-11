import useGameStore from '../../store/useGameStore';
import { getTarget } from '../../store/gameLogic';
import styles from './Overlay.module.css';

export default function Overlay() {
  const phase = useGameStore((s) => s.phase);
  const money = useGameStore((s) => s.money);
  const roundBonus = useGameStore((s) => s.roundBonus);
  const round = useGameStore((s) => s.round);
  const score = useGameStore((s) => s.score);
  const turn = useGameStore((s) => s.turn);
  const nextRound = useGameStore((s) => s.nextRound);
  const resetGame = useGameStore((s) => s.resetGame);

  if (phase !== 'win' && phase !== 'loss') return null;

  const isWin = phase === 'win';
  const target = getTarget(round);

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <h2 className={isWin ? styles.winTitle : styles.lossTitle}>
          {isWin ? 'Round Complete!' : 'Game Over'}
        </h2>

        <div className={styles.stats}>
          <span>Cleared in {turn} turns</span>
          <span>Score: {score}/{target}</span>
        </div>

        {isWin && roundBonus > 0 && (
          <p className={styles.bonus}>+${roundBonus}</p>
        )}

        <p className={styles.money}>Total: ${money.toLocaleString()}</p>

        <button
          className={styles.btn}
          onClick={isWin ? nextRound : resetGame}
        >
          {isWin ? 'Next Round' : 'Play Again'}
        </button>
      </div>
    </div>
  );
}
