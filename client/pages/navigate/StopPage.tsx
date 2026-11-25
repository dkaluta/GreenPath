import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { speciesName } from "../../features/collection/species";
import actions from "../../features/verifications/actions.module.css";
import { BottomSheet } from "../../features/verifications/BottomSheet";
import { FIXTURE_TREE } from "../../features/verifications/fixture";
import {
  clearFlow,
  readFlow,
  startFlow,
  type StopTree,
} from "../../features/verifications/flow";
import { TreePicture } from "../../features/verifications/TreePicture";
import { fill, formatDistance } from "../../features/walks/format";
import { ensureWalk } from "../../features/walks/session";
import { useAuth } from "../../lib/auth";
import { t } from "../../lib/i18n";
import styles from "./StopPage.module.css";

/**
 * Wireframe 100:223, "עצרו כאן": a tree on the way that needs checking.
 *
 * Navigation opens it with the tree:
 *     navigate("/navigate/stop", { state: { tree } });
 * Without one (until routing supplies real trees) it shows a fixture tree.
 */
export default function StopPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Read once: a new tree from navigation starts a fresh check; otherwise
  // carry on with the one in progress.
  const [tree] = useState<StopTree>(() => {
    const passed = (location.state as { tree?: StopTree } | null)?.tree;
    if (passed) return startFlow(passed).tree;
    return readFlow()?.tree ?? startFlow(FIXTURE_TREE).tree;
  });

  const skip = useCallback(() => {
    clearFlow();
    navigate("/navigate");
  }, [navigate]);

  function photograph() {
    if (!user) {
      navigate("/signin", { state: { from: location.pathname } });
      return;
    }
    ensureWalk();
    navigate("/navigate/capture");
  }

  const name = speciesName(tree.species);

  return (
    <BottomSheet title={t.screens.stop.title} onClose={skip} variant="card">
      <div className={styles.tree}>
        <TreePicture
          src={tree.referenceImageUrl}
          alt={fill(t.verify.reference, { species: name })}
          size="sm"
        />
        <div className={styles.details}>
          <p className={styles.name}>{name}</p>
          <p className={styles.line}>
            {fill(t.verify.side[tree.side], {
              distance: formatDistance(tree.distanceM),
            })}
          </p>
          {tree.houseNumber ? (
            <p className={styles.line}>
              <Address number={tree.houseNumber} street={tree.street} />
            </p>
          ) : null}
        </div>
      </div>

      <button type="button" className={actions.primary} onClick={photograph}>
        {t.actions.photograph}
      </button>
      <button type="button" className={actions.quiet} onClick={skip}>
        {t.actions.skip}
      </button>
    </BottomSheet>
  );
}

/** "Opposite number 12, <street>", with the street isolated: it is data, in any script. */
function Address({
  number,
  street,
}: {
  number: string;
  street: string | null;
}) {
  if (!street) return <>{fill(t.verify.opposite, { number })}</>;
  const [before, after] = fill(t.verify.oppositeOnStreet, { number }).split(
    "{street}",
  );
  return (
    <>
      {before}
      <bdi dir="auto">{street}</bdi>
      {after}
    </>
  );
}
