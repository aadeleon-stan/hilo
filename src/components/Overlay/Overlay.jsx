import useGameStore from '../../store/useGameStore';
import {
  getTarget,
  getRunTarget,
  RUN_ROUNDS,
  RUN_MAX_ENERGY,
  RUN_TURN_REFUND,
} from '../../store/gameLogic';
import styles from './Overlay.module.css';

export default function Overlay() {
  const phase = useGameStore((s) => s.phase);
  const mode = useGameStore((s) => s.mode);
  const bank = useGameStore((s) => s.bank);
  const energy = useGameStore((s) => s.energy);
  const roundBonus = useGameStore((s) => s.roundBonus);
  const turnsAtEnd = useGameStore((s) => s.turnsAtEnd);
  const round = useGameStore((s) => s.round);
  const score = useGameStore((s) => s.score);
  const turn = useGameStore((s) => s.turn);
  const nextRound = useGameStore((s) => s.nextRound);
  const resetGame = useGameStore((s) => s.resetGame);

  if (phase !== 'win' && phase !== 'loss' && phase !== 'runWon') return null;

  const isRun = mode === 'run';
  const isWin = phase !== 'loss';
  const target = isRun ? getRunTarget(round) : getTarget(round);

  let title;
  if (phase === 'runWon') title = 'Run Complete!';
  else if (isWin) title = 'Round Complete!';
  else title = isRun ? 'Run Over' : 'Game Over';

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <h2 className={isWin ? styles.winTitle : styles.lossTitle}>{title}</h2>

        <div className={styles.stats}>
          {isWin ? (
            <span>Cleared in {turn} turns</span>
          ) : (
            <span>{energy <= 0 ? 'Out of energy!' : 'Ran out of turns!'}</span>
          )}
          <span>Score: {score}/{target}</span>
          {isRun && !isWin && <span>Reached round {round} / {RUN_ROUNDS}</span>}
        </div>

        {isWin && !isRun && (
          <div className={styles.bonusBlock}>
            {roundBonus > 0 && (
              <p className={styles.bonus}>+{roundBonus} bonus ({turnsAtEnd} turns saved &times; 25)</p>
            )}
            {energy > 0 && (
              <p className={styles.energySaved}>+{energy} energy saved</p>
            )}
            <p className={styles.bonusTotal}>= {roundBonus + energy} banked</p>
          </div>
        )}

        {isWin && isRun && roundBonus > 0 && (
          <div className={styles.bonusBlock}>
            <p className={styles.energySaved}>+{roundBonus} energy recovered</p>
            <p className={styles.bonusTotal}>
              {turnsAtEnd} turns left &times; {RUN_TURN_REFUND}
              {roundBonus < turnsAtEnd * RUN_TURN_REFUND && ' (capped at max)'}
            </p>
          </div>
        )}

        <p className={styles.total}>
          {isRun
            ? `Energy: ${Math.max(energy, 0)} / ${RUN_MAX_ENERGY}`
            : `Bank: ${bank.toLocaleString()}`}
        </p>

        <button
          className={styles.btn}
          onClick={phase === 'win' ? nextRound : resetGame}
        >
          {phase === 'win' ? 'Next Round' : 'Play Again'}
        </button>
      </div>
    </div>
  );
}
