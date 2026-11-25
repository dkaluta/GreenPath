import type { ReportKind } from "@shared/schemas/report";
import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Spinner, useToast } from "../../components";
import { currentPosition, useCreateReport } from "../../features/reports/hooks";
import actions from "../../features/verifications/actions.module.css";
import { BottomSheet } from "../../features/verifications/BottomSheet";
import type { StopTree } from "../../features/verifications/flow";
import {
  CloseIcon,
  TreeAddIcon,
  TreeDamagedIcon,
  TreeMissingIcon,
} from "../../features/verifications/icons";
import { SignInPrompt } from "../../features/verifications/SignInPrompt";
import { ApiRequestError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { t } from "../../lib/i18n";
import styles from "./ReportPage.module.css";

const KINDS: { kind: ReportKind; Icon: typeof TreeAddIcon }[] = [
  { kind: "missing_from_map", Icon: TreeAddIcon },
  { kind: "gone", Icon: TreeMissingIcon },
  { kind: "damaged", Icon: TreeDamagedIcon },
];

/**
 * Wireframe 100:181, "מה רואים כאן?": a bottom sheet with three kinds of
 * report. The report is placed where the phone is. Navigation can pass the
 * nearest tree (`navigate("/navigate/report", { state: { tree } })`) so a
 * "gone" or "damaged" report points at it.
 */
export default function ReportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const toast = useToast();
  const createReport = useCreateReport();
  const [pending, setPending] = useState<ReportKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tree = (location.state as { tree?: StopTree } | null)?.tree ?? null;
  const close = useCallback(() => navigate("/navigate"), [navigate]);

  async function send(kind: ReportKind) {
    setError(null);
    setPending(kind);
    const point = await currentPosition();
    const treeId = kind === "missing_from_map" ? null : (tree?.id ?? null);

    if (!point && !treeId) {
      setPending(null);
      setError(t.report.noLocation);
      return;
    }

    createReport.mutate(
      { kind, tree_id: treeId, location: point, street: tree?.street ?? null },
      {
        onSuccess: () => {
          toast.add({
            title: kind === "damaged" ? t.report.sentDamaged : t.report.sent,
          });
          close();
        },
        onError: (err) => {
          setPending(null);
          setError(
            err instanceof ApiRequestError && err.status === 401
              ? t.verify.signInTitle
              : t.report.failed,
          );
        },
      },
    );
  }

  return (
    <BottomSheet
      title={t.report.title}
      onClose={close}
      action={
        <button
          type="button"
          className={actions.round}
          aria-label={t.report.close}
          onClick={close}
        >
          <CloseIcon size={20} />
        </button>
      }
    >
      {!loading && !user ? (
        <SignInPrompt />
      ) : (
        <ul className={styles.kinds}>
          {KINDS.map(({ kind, Icon }) => {
            const words = t.report.kinds[kind];
            return (
              <li key={kind}>
                <button
                  type="button"
                  className={styles.kind}
                  disabled={pending !== null}
                  aria-busy={pending === kind}
                  onClick={() => void send(kind)}
                >
                  <span className={styles.text}>
                    <span className={styles.kindTitle}>{words.title}</span>
                    {words.hint ? (
                      <span className={styles.hint}>{words.hint}</span>
                    ) : null}
                  </span>
                  <span className={styles.icon}>
                    {pending === kind ? <Spinner size="sm" /> : <Icon />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p role="status" className={styles.status}>
        {pending && !createReport.isPending ? t.report.locating : null}
      </p>
      {error ? (
        <p role="alert" className={actions.error}>
          {error}
        </p>
      ) : null}
    </BottomSheet>
  );
}
