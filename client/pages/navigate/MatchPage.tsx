import type { VerificationAnswer } from "@shared/schemas/verification";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useToast } from "../../components";
import { speciesName } from "../../features/collection/species";
import { MapScreen } from "../../features/map";
import actions from "../../features/verifications/actions.module.css";
import { clearFlow, currentFlow } from "../../features/verifications/flow";
import { useCreateVerification } from "../../features/verifications/hooks";
import { SignInPrompt } from "../../features/verifications/SignInPrompt";
import { TreePicture } from "../../features/verifications/TreePicture";
import { fill } from "../../features/walks/format";
import { recordTree } from "../../features/walks/session";
import { useAuth } from "../../lib/auth";
import { t } from "../../lib/i18n";
import styles from "./MatchPage.module.css";

/**
 * Wireframe 100:275, "זה אותו עץ?": your photo next to how the expected
 * species usually looks, and yes / no / not sure. "Yes" adds the species
 * to the collection. A full page, as in the wireframe.
 */
export default function MatchPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const toast = useToast();
  const verify = useCreateVerification();
  const [flow] = useState(currentFlow);
  const [chosen, setChosen] = useState<VerificationAnswer | null>(null);

  const name = speciesName(flow.tree.species);

  function answer(value: VerificationAnswer) {
    setChosen(value);
    verify.mutate(
      {
        tree_id: flow.tree.id,
        location: { lat: flow.tree.lat, lng: flow.tree.lng },
        species: flow.tree.species,
        street: flow.tree.street,
        answer: value,
        tree_photo_path: flow.treePhoto?.path,
        leaves_photo_path: flow.leavesPhoto?.path,
      },
      {
        onSuccess: () => {
          recordTree({
            treeId: flow.tree.id,
            species: flow.tree.species,
            answer: value,
          });
          clearFlow();
          toast.add({
            title:
              value === "same"
                ? fill(t.verify.match.savedSame, { species: name })
                : t.verify.match.saved,
          });
          navigate("/navigate");
        },
      },
    );
  }

  if (!loading && !user) {
    return (
      <MapScreen title={t.verify.match.title} back="/navigate">
        <SignInPrompt />
      </MapScreen>
    );
  }

  if (!flow.treePhoto) {
    return (
      <MapScreen title={t.verify.match.title} back="/navigate" phone="page">
        <p>{t.verify.match.noPhoto}</p>
        <Link to="/navigate/capture" className={actions.primary}>
          {t.verify.match.retake}
        </Link>
      </MapScreen>
    );
  }

  const busy = verify.isPending;

  return (
    <MapScreen title={t.verify.match.title} back="/navigate" phone="page">
      <figure className={styles.yours}>
        <TreePicture src={flow.treePhoto.url} alt="" size="lg" />
        <figcaption className={styles.label}>
          {t.verify.match.yourPhoto}
        </figcaption>
      </figure>

      <div className={styles.reference}>
        <TreePicture src={flow.tree.referenceImageUrl} alt="" size="sm" />
        <div>
          <p className={styles.name}>{name}</p>
          <p className={styles.usually}>{t.verify.match.usually}</p>
        </div>
      </div>

      <div className={styles.answers}>
        {verify.isError ? (
          <p role="alert" className={actions.error}>
            {t.verify.match.failed}
          </p>
        ) : null}
        <button
          type="button"
          className={actions.primary}
          disabled={busy}
          aria-busy={busy && chosen === "same"}
          onClick={() => answer("same")}
        >
          {t.verify.match.yes}
        </button>
        <div className={actions.pair}>
          <button
            type="button"
            className={actions.secondary}
            disabled={busy}
            aria-busy={busy && chosen === "different"}
            onClick={() => answer("different")}
          >
            {t.verify.match.no}
          </button>
          <button
            type="button"
            className={actions.secondary}
            disabled={busy}
            aria-busy={busy && chosen === "not_sure"}
            onClick={() => answer("not_sure")}
          >
            {t.verify.match.notSure}
          </button>
        </div>
      </div>
    </MapScreen>
  );
}
