import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useToast } from "../../components";
import { MapScreen } from "../../features/map";
import {
  useCreateVerification,
  useUploadPhoto,
} from "../../features/verifications/hooks";
import {
  clearFlow,
  currentFlow,
  writeFlow,
} from "../../features/verifications/flow";
import { CloseIcon } from "../../features/verifications/icons";
import { fileToJpeg, frameToJpeg } from "../../features/verifications/photo";
import { SignInPrompt } from "../../features/verifications/SignInPrompt";
import { fill, formatNumber } from "../../features/walks/format";
import { ApiRequestError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { t } from "../../lib/i18n";
import styles from "./CapturePage.module.css";

type Camera = "starting" | "live" | "unavailable";

/**
 * Wireframe 100:255: the camera. Step 1/2 is the whole tree, step 2/2 its
 * leaves; each photo uploads as soon as it is taken. "No tree here" records
 * that answer and goes back to navigating.
 *
 * Uses the live camera (getUserMedia) where the browser allows it, and
 * falls back to the phone's own camera app through
 * <input type="file" capture="environment">.
 */
export default function CapturePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const toast = useToast();
  const upload = useUploadPhoto();
  const verify = useCreateVerification();

  const video = useRef<HTMLVideoElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState<Camera>("starting");
  const [flow, setFlow] = useState(currentFlow);
  const [error, setError] = useState<string | null>(null);

  // Step 2 once the whole tree is in.
  const step: 1 | 2 = flow.treePhoto ? 2 : 1;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamera("unavailable");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play().catch(() => undefined);
        }
        setCamera("live");
      } catch {
        // Refused, no camera, or not a secure page.
        setCamera("unavailable");
      }
    }

    void start();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function submitPhoto(file: File | null) {
    if (!file) return;
    setError(null);
    try {
      const photo = await upload.mutateAsync(file);
      const next =
        step === 1
          ? { ...flow, treePhoto: photo }
          : { ...flow, leavesPhoto: photo };
      writeFlow(next);
      setFlow(next);
      if (step === 2) navigate("/navigate/match");
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.status !== 500
          ? err.message
          : t.verify.capture.uploadFailed,
      );
    }
  }

  async function shoot() {
    if (camera === "live" && video.current?.videoWidth) {
      await submitPhoto(await frameToJpeg(video.current).catch(() => null));
    } else {
      fileInput.current?.click();
    }
  }

  function noTree() {
    setError(null);
    verify.mutate(
      {
        tree_id: flow.tree.id,
        location: { lat: flow.tree.lat, lng: flow.tree.lng },
        species: flow.tree.species,
        street: flow.tree.street,
        answer: "no_tree",
      },
      {
        onSuccess: () => {
          clearFlow();
          toast.add({ title: t.verify.capture.noTreeSaved });
          navigate("/navigate");
        },
        onError: () => setError(t.verify.match.failed),
      },
    );
  }

  if (!loading && !user) {
    return (
      <MapScreen title={t.screens.capture.title} back="/navigate/stop">
        <SignInPrompt />
      </MapScreen>
    );
  }

  const busy = upload.isPending || verify.isPending;
  const what = step === 1 ? t.verify.capture.whole : t.verify.capture.leaves;

  return (
    <div className={styles.screen}>
      <video
        ref={video}
        className={styles.video}
        playsInline
        muted
        hidden={camera !== "live"}
      />

      <div className={styles.top}>
        <span className={styles.step}>
          {fill(t.verify.capture.step, { step: formatNumber(step), what })}
        </span>
        <button
          type="button"
          className={styles.close}
          aria-label={t.verify.capture.close}
          onClick={() => navigate("/navigate/stop")}
        >
          <CloseIcon size={20} />
        </button>
      </div>

      <div className={styles.frame} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className={styles.middle}>
        {camera === "unavailable" ? (
          <p className={styles.message}>{t.verify.capture.noCamera}</p>
        ) : null}
        <p className={styles.hint}>
          {step === 1
            ? t.verify.capture.wholeHint
            : t.verify.capture.leavesHint}
        </p>
      </div>

      <div className={styles.bottom}>
        <p role="status" className={styles.status}>
          {upload.isPending ? t.verify.capture.uploading : null}
        </p>
        {error ? (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          className={styles.fileInput}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            // Scaled down when the browser can; sent as it is when not.
            void fileToJpeg(file)
              .catch(() => file)
              .then(submitPhoto);
          }}
        />
        <button
          type="button"
          className={styles.shutter}
          aria-label={
            camera === "live"
              ? `${t.verify.capture.shutter}: ${what}`
              : t.verify.capture.pickPhoto
          }
          disabled={busy || camera === "starting"}
          aria-busy={upload.isPending}
          onClick={() => void shoot()}
        >
          <span className={styles.shutterInner} />
        </button>

        {step === 1 ? (
          <button
            type="button"
            className={styles.noTree}
            disabled={busy}
            onClick={noTree}
          >
            {t.verify.capture.noTree}
          </button>
        ) : null}
      </div>
    </div>
  );
}
