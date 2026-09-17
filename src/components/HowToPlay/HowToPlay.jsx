import { useEffect, useRef, useState } from 'react';
import ProductReveal from '../ProductReveal/ProductReveal';
import StatBar from '../StatBar/StatBar';
import { computeProduct, getBestPlayBonus, getRunTarget, RUN_MAX_ENERGY } from '../../store/gameLogic';
import styles from './HowToPlay.module.css';

const PAGE_COUNT = 4;
const demo = computeProduct(47, 68);
// A cheap, high-scoring move (−3 energy, +99 pts) that's a best play on about
// 92% of simulated mid-round boards containing it.
const optimalDemo = computeProduct(19, 21);
// Pages with a looping demo. The demos finish in ~1.6s; this holds the result
// for about two seconds before replaying.
const DEMO_PAGES = [0, 1, 2];
const DEMO_LOOP_MS = 3500;
// Mid-round state the page 2 demo applies the example move to.
const DEMO_SCORE_BEFORE = 120;
const DEMO_ENERGY_BEFORE = 120;

// Shows the example move landing on the score and energy bars. Mounts with
// the "before" values, then applies the move so the bars animate; remount to
// replay.
function DemoBars() {
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setApplied(true), 600);
    return () => clearTimeout(id);
  }, []);

  const target = getRunTarget(1);
  const score = DEMO_SCORE_BEFORE + (applied ? demo.lowWord : 0);
  const energy = DEMO_ENERGY_BEFORE - (applied ? demo.highWord : 0);
  const pct = Math.min((score / target) * 100, 100);

  return (
    <div className={styles.demoBars}>
      <span className={styles.demoMove}>
        {demo.a} &times; {demo.b} = {demo.product} &rarr;{' '}
        <span className={styles.gold}>&minus;{demo.highWord} energy</span> &middot;{' '}
        <span className={styles.cyan}>+{demo.lowWord} pts</span>
      </span>
      <StatBar
        label="Score"
        pct={pct}
        color={pct >= 80 ? 'var(--success)' : 'var(--accent)'}
        text={`${score} / ${target}`}
        fillDelay="0s"
      />
      <StatBar
        variant="energy"
        label="Energy"
        pct={(energy / RUN_MAX_ENERGY) * 100}
        color="var(--gold)"
        text={`${energy} / ${RUN_MAX_ENERGY}`}
        fillDelay="0s"
      />
    </div>
  );
}

export default function HowToPlay({ onClose, onStartRun }) {
  const [page, setPage] = useState(0);
  const [replay, setReplay] = useState(0);
  const primaryRef = useRef(null);

  // All numbers come from gameLogic so the rules text follows the tuning.
  const pages = [
    {
      title: 'Make a move',
      body: (
        <>
          <p>Pick one number from each pool. They multiply:</p>
          <ProductReveal key={replay} result={demo} />
          <p>
            The <span className={styles.gold}>leading digits</span> cost that much
            energy. The <span className={styles.cyan}>last two digits</span> are your
            points.
          </p>
        </>
      ),
    },
    {
      title: 'Clear the round',
      body: (
        <>
          <p>Each round has a target score, and you have 9 turns to reach it.</p>
          <DemoBars key={replay} />
          <p>
            Watch your energy: a move that costs more than you have{' '}
            <span className={styles.danger}>ends your game</span>, even if it would
            have reached the target.
          </p>
        </>
      ),
    },
    {
      title: 'Play smart',
      body: (
        <>
          <p>
            An <span className={styles.tag}>Optimal!</span> tag means your move was
            one of the best on the board. It gives back part of its cost: a{' '}
            {optimalDemo.highWord}-energy move returns{' '}
            <strong>+{getBestPlayBonus(optimalDemo.highWord)}</strong>.
          </p>
          <ProductReveal
            key={replay}
            result={optimalDemo}
            label={`Optimal! +${getBestPlayBonus(optimalDemo.highWord)} energy`}
            optimal
          />
        </>
      ),
    },
    {
      title: 'Going the distance',
      body: (
        <>
          <p>
            In game modes with multiple rounds, the targets climb and your energy
            carries over from round to round, so every point of energy you save
            early is energy you still have later.
          </p>
          <p>
            Clear a round with turns to spare and you get some of that energy
            back. Some modes hand out upgrades between rounds; others bank your
            leftovers as score and keep going until you run dry.
          </p>
        </>
      ),
    },
  ];

  const isLast = page === PAGE_COUNT - 1;

  useEffect(() => {
    primaryRef.current?.focus();
  }, [page]);

  // Loop the demos while their page is showing; remounting replays them.
  useEffect(() => {
    if (!DEMO_PAGES.includes(page)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setReplay((r) => r + 1), DEMO_LOOP_MS);
    return () => clearInterval(id);
  }, [page]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setPage((p) => Math.min(p + 1, PAGE_COUNT - 1));
      else if (e.key === 'ArrowLeft') setPage((p) => Math.max(p - 1, 0));
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-to-play-title"
      >
        <button className={styles.close} onClick={onClose} aria-label="Close">
          &times;
        </button>

        <div key={page} className={styles.page}>
          <h2 id="how-to-play-title" className={styles.title}>
            {pages[page].title}
          </h2>
          <div className={styles.body}>{pages[page].body}</div>
        </div>

        <div className={styles.dots}>
          {pages.map((p, i) => (
            <button
              key={p.title}
              className={`${styles.dot} ${i === page ? styles.activeDot : ''}`}
              onClick={() => setPage(i)}
              aria-label={`Page ${i + 1}: ${p.title}`}
              aria-current={i === page ? 'step' : undefined}
            />
          ))}
        </div>

        <div className={styles.actions}>
          {isLast ? (
            <>
              <button className={styles.secondary} onClick={onClose}>
                Close
              </button>
              <button ref={primaryRef} className={styles.primary} onClick={onStartRun}>
                Start a run
              </button>
            </>
          ) : (
            <>
              {page > 0 ? (
                <button className={styles.secondary} onClick={() => setPage(page - 1)}>
                  Back
                </button>
              ) : (
                <span />
              )}
              <button
                ref={primaryRef}
                className={styles.primary}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
