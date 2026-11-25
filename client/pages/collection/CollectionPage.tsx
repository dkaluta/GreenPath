import { Link } from "react-router";
import { Spinner } from "../../components";
import { useCollection } from "../../features/collection/hooks";
import { CATALOGUE, speciesName } from "../../features/collection/species";
import { MapScreen } from "../../features/map";
import actions from "../../features/verifications/actions.module.css";
import { TreePicture } from "../../features/verifications/TreePicture";
import { plural } from "../../features/walks/format";
import { t } from "../../lib/i18n";
import styles from "./CollectionPage.module.css";

/**
 * Wireframe 100:321, "האוסף שלי": the tree species the person has
 * confirmed, then a "not yet" slot for each common species still to find.
 * A full page on phones; the floating panel over the map on desktop, like
 * Google Maps' saved places. Back goes where the person came from.
 */
export default function CollectionPage() {
  const collection = useCollection();

  if (collection.isPending) {
    return (
      <MapScreen title={t.collection.title} phone="page">
        <Spinner />
      </MapScreen>
    );
  }

  if (collection.isError) {
    return (
      <MapScreen title={t.collection.title} phone="page">
        <p role="alert" className={actions.error}>
          {t.collection.failed}
        </p>
        <button
          type="button"
          className={actions.secondary}
          onClick={() => void collection.refetch()}
        >
          {t.collection.retry}
        </button>
      </MapScreen>
    );
  }

  const { species, streets_helped } = collection.data;
  const collected = new Set(species.map((s) => s.species));
  const notYet = CATALOGUE.filter(
    (entry) =>
      !collected.has(entry.scientific) &&
      // A collected "Ficus nitida" fills the ficus slot too.
      !species.some(
        (s) => speciesName(s.species) === t.collection.species[entry.key],
      ),
  );

  return (
    <MapScreen title={t.collection.title} phone="page">
      <p className={styles.subtitle}>
        {species.length
          ? `${plural(t.collection.speciesCount, species.length)} · ${plural(
              t.collection.streetsCount,
              streets_helped,
            )}`
          : t.collection.empty}
      </p>

      <ul className={styles.grid}>
        {species.map((entry) => {
          const name = speciesName(entry.species);
          return (
            <li key={entry.species} className={styles.slot}>
              <TreePicture src={entry.photo_url} alt="" />
              <span className={styles.name} dir="auto">
                {name}
              </span>
            </li>
          );
        })}
        {notYet.map((entry) => (
          <li key={entry.scientific} className={styles.slot}>
            <div className={styles.unknown} aria-hidden="true">
              ?
            </div>
            <span className={styles.notYet}>{t.collection.notYet}</span>
          </li>
        ))}
      </ul>

      {species.length === 0 ? (
        <Link to="/" className={actions.primary}>
          {t.actions.backToMap}
        </Link>
      ) : null}
    </MapScreen>
  );
}
