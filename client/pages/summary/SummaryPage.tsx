import type { Walk } from "@shared/schemas/walk";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Spinner } from "../../components";
import { speciesName } from "../../features/collection/species";
import actions from "../../features/verifications/actions.module.css";
import { CheckIcon, TreeIcon } from "../../features/verifications/icons";
import { SignInPrompt } from "../../features/verifications/SignInPrompt";
import {
  formatNumber,
  formatPercent,
  plural,
} from "../../features/walks/format";
import { useFinishWalk, useWalks } from "../../features/walks/hooks";
import {
  clearWalk,
  readWalk,
  summarizeWalk,
  toWalkInput,
} from "../../features/walks/session";
import { useAuth } from "../../lib/auth";
import { t } from "../../lib/i18n";
import styles from "./SummaryPage.module.css";

type Shown = Pick<Walk, "distance_m" | "steps" | "shade_share"> & {
  trees: { species: string | null }[];
};

/**
 * Wireframe 100:297, "הגעתם": the walk that just ended.
 *
 * Opening this screen ends the walk on the phone (features/walks/session)
 * and records it with POST /api/walks. Without a walk in progress it shows
 * the person's latest one.
 */
export default function SummaryPage() {
  const { user, loading } = useAuth();
  const [local] = useState(readWalk);
  const finish = useFinishWalk();
  const walks = useWalks(Boolean(user) && !local);
  const sent = useRef(false);

  function save() {
    if (!local) return;
    finish.mutate(toWalkInput(local), { onSuccess: () => clearWalk() });
  }

  useEffect(() => {
    if (loading || !user || !local || sent.current) return;
    sent.current = true;
    save();
    // Runs once, when the login is known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, local]);

  const shown: Shown | null =
    finish.data ??
    (local ? { ...summarizeWalk(local), trees: local.trees } : null) ??
    walks.data?.[0] ??
    null;

  if (loading || (walks.isLoading && !shown)) {
    return (
      <main className={styles.page}>
        <Spinner />
      </main>
    );
  }

  if (!shown) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>{t.screens.summary.title}</h1>
        <p className={styles.empty}>{t.summary.empty}</p>
        <Link to="/" className={actions.secondary}>
          {t.actions.backToMap}
        </Link>
      </main>
    );
  }

  const trees = shown.trees;
  const species = [
    ...new Set(trees.map((tree) => speciesName(tree.species)).filter(Boolean)),
  ];

  return (
    <main className={styles.page}>
      <div className={styles.check} aria-hidden="true">
        <CheckIcon size={32} />
      </div>
      <h1 className={styles.title}>{t.summary.title}</h1>

      <dl className={styles.stats}>
        <div>
          <dt>{t.summary.distance}</dt>
          <dd>{formatNumber(shown.distance_m / 1000, 1)}</dd>
        </div>
        <div>
          <dt>{t.summary.steps}</dt>
          <dd>{formatNumber(shown.steps)}</dd>
        </div>
        <div>
          <dt>{t.summary.shade}</dt>
          <dd>
            {shown.shade_share === null
              ? "–"
              : formatPercent(shown.shade_share)}
          </dd>
        </div>
      </dl>

      <div className={styles.trees}>
        <span className={styles.treeIcon}>
          <TreeIcon size={20} />
        </span>
        <div>
          <p>
            {trees.length
              ? plural(t.summary.trees, trees.length)
              : t.summary.noTrees}
          </p>
          {species.length ? (
            <p className={styles.species}>{species.join(" · ")}</p>
          ) : null}
        </div>
      </div>

      <div className={styles.footer}>
        <p role="status" className={styles.status}>
          {finish.isPending ? t.summary.saving : null}
        </p>
        {finish.isError ? (
          <div className={actions.error} role="alert">
            <p>{t.summary.saveFailed}</p>
            <button type="button" className={actions.quiet} onClick={save}>
              {t.summary.retry}
            </button>
          </div>
        ) : null}
        {!user ? <SignInPrompt message={t.summary.signIn} /> : null}
        <Link to="/collection" className={actions.primary}>
          {t.summary.toCollection}
        </Link>
      </div>
    </main>
  );
}
