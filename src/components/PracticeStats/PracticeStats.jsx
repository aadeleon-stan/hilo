import { useState } from 'react';
import useGameStore from '../../store/useGameStore';
import Modal from '../Modal/Modal';
import MoveList from '../MoveList/MoveList';
import modalStyles from '../Modal/Modal.module.css';
import styles from './PracticeStats.module.css';

// End of a practice round: the plays in order, with optimal ones marked. The
// board stays behind it, so "View board" just hides this for a moment.
export default function PracticeStats() {
  const phase = useGameStore((s) => s.phase);
  const moveLog = useGameStore((s) => s.moveLog);
  const score = useGameStore((s) => s.score);
  const roundTarget = useGameStore((s) => s.roundTarget);
  const energy = useGameStore((s) => s.energy);
  const maxEnergy = useGameStore((s) => s.maxEnergy);
  const turn = useGameStore((s) => s.turn);
  const resetPracticeRound = useGameStore((s) => s.resetPracticeRound);
  const resetGame = useGameStore((s) => s.resetGame);
  const [hidden, setHidden] = useState(false);

  const won = phase === 'win';
  const optimals = moveLog.filter((m) => m.isBest).length;

  if (hidden) {
    return (
      <button className={styles.reopen} onClick={() => setHidden(false)}>
        Show round stats
      </button>
    );
  }

  return (
    <Modal
      titleId="practice-stats-title"
      title={won ? 'Round cleared!' : 'Round over'}
      subtitle={
        won
          ? `${score} / ${roundTarget} in ${turn} turns`
          : `Stopped at ${score} / ${roundTarget}`
      }
      focusKey={`practice-${turn}-${won}`}
    >
      <div className={styles.summary}>
        <span>
          Energy left: <strong>{Math.max(energy, 0)}</strong> / {maxEnergy}
        </span>
        <span>
          Optimal plays: <strong>{optimals}</strong> of {moveLog.length}
        </span>
      </div>

      <h3 className={modalStyles.sectionTitle}>Your plays</h3>
      <MoveList moves={moveLog} />

      <div className={modalStyles.actions}>
        <button className={modalStyles.secondary} onClick={() => setHidden(true)}>
          View board
        </button>
        <button className={modalStyles.secondary} onClick={resetGame}>
          Leave practice
        </button>
        <button className={modalStyles.primary} onClick={resetPracticeRound}>
          Reset round
        </button>
      </div>
    </Modal>
  );
}
