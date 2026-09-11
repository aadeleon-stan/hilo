import useGameStore from '../../store/useGameStore';
import styles from './Overlay.module.css';

export default function Overlay() {
  const phase = useGameStore((s) => s.phase);
  const money = useGameStore((s) => s.money);
  const roundBonus = useGameStore((s) => s.roundBonus);
  const lastResult = useGameStore((s) => s.lastResult);
  const nextRound = useGameStore((s) => s.nextRound);
  const resetGame = useGameStore((s) => s.resetGame);

  if (phase !== 'win' && phase !== 'loss') return null;

  const isWin = phase === 'win';

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <h2 className={isWin ? styles.winTitle : styles.lossTitle}>
          {isWin ? 'Round Complete!' : 'Game Over'}
        </h2>

        {lastResult && (
          <p className={styles.detail}>
            Last: {lastResult.a} x {lastResult.b} = {lastResult.product}
          </p>
        )}

        {isWin && roundBonus > 0 && (
          <p className={styles.bonus}>Round Bonus: +${roundBonus}</p>
        )}
        <p className={styles.money}>Total Money: ${money}</p>

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
