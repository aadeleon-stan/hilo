import useGameStore from '../../store/useGameStore';
import { getRunNetPar, RUN_TURN_REFUND } from '../../store/gameLogic';
import { MODES } from '../../store/modes';
import styles from './Overlay.module.css';

// Net energy use: positive means energy was used, negative means it was gained.
function formatNet(net) {
  if (net > 0) return `−${net}`;
  if (net < 0) return `+${-net}`;
  return '0';
}

export default function Overlay() {
  const phase = useGameStore((s) => s.phase);
  const mode = useGameStore((s) => s.mode);
  const bank = useGameStore((s) => s.bank);
  const energy = useGameStore((s) => s.energy);
  const maxEnergy = useGameStore((s) => s.maxEnergy);
  const roundTarget = useGameStore((s) => s.roundTarget);
  const roundStartEnergy = useGameStore((s) => s.roundStartEnergy);
  const roundBonus = useGameStore((s) => s.roundBonus);
  const refundUncapped = useGameStore((s) => s.refundUncapped);
  const moneyEarned = useGameStore((s) => s.moneyEarned);
  const money = useGameStore((s) => s.money);
  const turnsAtEnd = useGameStore((s) => s.turnsAtEnd);
  const round = useGameStore((s) => s.round);
  const score = useGameStore((s) => s.score);
  const turn = useGameStore((s) => s.turn);
  const nextRound = useGameStore((s) => s.nextRound);
  const continueAfterWin = useGameStore((s) => s.continueAfterWin);
  const resetGame = useGameStore((s) => s.resetGame);

  const rules = MODES[mode];
  if (phase !== 'win' && phase !== 'loss' && phase !== 'runWon') return null;
  // Modes with their own end screen (practice stats, the daily result) render
  // it from GameScreen instead.
  if (rules.endScreen !== 'overlay') return null;
  const isWin = phase !== 'loss';
  const net = roundStartEnergy - energy;
  const netPar = rules.parHints ? getRunNetPar(round) : null;

  let title;
  if (phase === 'runWon') title = 'Run Complete!';
  else if (isWin) title = 'Round Complete!';
  else title = rules.lossTitle;

  // Arcade's refund is a flat rate per turn; the roguelike's depends on the build.
  const refundCapped = rules.money
    ? roundBonus < refundUncapped
    : roundBonus < turnsAtEnd * RUN_TURN_REFUND;

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
          <span>Score: {score}/{roundTarget}</span>
          {rules.rounds && !isWin && <span>Reached round {round} / {rules.rounds}</span>}
        </div>

        {isWin && rules.bank && (
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

        {isWin && !rules.bank && (roundBonus > 0 || rules.money) && (
          <div className={styles.bonusBlock}>
            {roundBonus > 0 && (
              <p className={styles.energySaved}>+{roundBonus} energy recovered</p>
            )}
            {rules.money && (
              <p className={styles.moneyEarned}>+${moneyEarned} earned</p>
            )}
            <p className={styles.bonusTotal}>
              {turnsAtEnd} turns left
              {!rules.money && <> &times; {RUN_TURN_REFUND}</>}
              {refundCapped && ' (capped at max)'}
            </p>
          </div>
        )}

        {isWin && rules.parHints && (
          <p className={`${styles.netPar} ${net <= netPar ? styles.underPar : styles.overPar}`}>
            Net energy: {formatNet(net)} &middot; par {formatNet(netPar)}
          </p>
        )}

        <p className={styles.total}>
          {rules.bank
            ? `Bank: ${bank.toLocaleString()}`
            : `Energy: ${Math.max(energy, 0)} / ${maxEnergy}`}
        </p>
        {rules.money && <p className={styles.moneyTotal}>Money: ${money}</p>}

        {phase === 'win' ? (
          <button
            className={styles.btn}
            onClick={rules.money ? continueAfterWin : nextRound}
          >
            {rules.money ? 'Continue' : 'Next Round'}
          </button>
        ) : (
          <button className={styles.btn} onClick={resetGame}>
            Play Again
          </button>
        )}
      </div>
    </div>
  );
}
