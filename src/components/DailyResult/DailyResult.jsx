import { useState } from 'react';
import useGameStore from '../../store/useGameStore';
import useDailyStore, { bestEnergyLeft, dailyStreak } from '../../store/useDailyStore';
import Modal from '../Modal/Modal';
import MoveList from '../MoveList/MoveList';
import modalStyles from '../Modal/Modal.module.css';
import styles from './DailyResult.module.css';

// End of the daily round: today's result, the plays, and how it fits the
// player's history. One attempt a day, so there's no retry — but the board
// stays behind this, and "View board" hides it so the leftover factors can be
// studied.
export default function DailyResult() {
  const phase = useGameStore((s) => s.phase);
  const moveLog = useGameStore((s) => s.moveLog);
  const score = useGameStore((s) => s.score);
  const roundTarget = useGameStore((s) => s.roundTarget);
  const energy = useGameStore((s) => s.energy);
  const maxEnergy = useGameStore((s) => s.maxEnergy);
  const turn = useGameStore((s) => s.turn);
  const dailyKey = useGameStore((s) => s.dailyKey);
  const resetGame = useGameStore((s) => s.resetGame);
  const results = useDailyStore((s) => s.results);
  const [hidden, setHidden] = useState(false);

  const won = phase === 'win';
  const streak = dailyStreak(results);
  const best = bestEnergyLeft(results);
  const optimals = moveLog.filter((m) => m.isBest).length;

  if (hidden) {
    return (
      <button className={styles.reopen} onClick={() => setHidden(false)}>
        Show results
      </button>
    );
  }

  return (
    <Modal
      titleId="daily-result-title"
      title={won ? 'Daily cleared!' : 'Daily missed'}
      subtitle={`${dailyKey} · ${score} / ${roundTarget}`}
      focusKey={`daily-${dailyKey}-${phase}`}
    >
      <div className={styles.summary}>
        <span>
          Energy left: <strong>{Math.max(energy, 0)}</strong> / {maxEnergy}
        </span>
        <span>
          Turns used: <strong>{turn}</strong>
        </span>
        <span>
          Optimal plays: <strong>{optimals}</strong> of {moveLog.length}
        </span>
      </div>

      <div className={styles.history}>
        <span>
          Streak: <strong>{streak}</strong> {streak === 1 ? 'day' : 'days'}
        </span>
        {best !== null && (
          <span>
            Best energy left: <strong>{best}</strong>
          </span>
        )}
      </div>

      <h3 className={modalStyles.sectionTitle}>Your plays</h3>
      <MoveList moves={moveLog} />

      <p className={styles.note}>A new challenge arrives at midnight Pacific.</p>

      <div className={modalStyles.actions}>
        <button className={modalStyles.secondary} onClick={() => setHidden(true)}>
          View board
        </button>
        <button className={modalStyles.primary} onClick={resetGame}>
          Leave
        </button>
      </div>
    </Modal>
  );
}
