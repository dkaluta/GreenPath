import { t } from "../../lib/i18n";

/*
 * The tree species the collection has slots for: the common street trees of
 * the pilot city. Keyed by scientific name, which is how the יע"ד dataset
 * and the API name them; the words people see are in strings.ts under
 * collection.species.
 *
 * A species someone collects that is not on this list still shows up in
 * their collection, by its scientific name.
 */

type SpeciesKey = keyof typeof t.collection.species;

export const CATALOGUE: { scientific: string; key: SpeciesKey }[] = [
  { scientific: "Ficus microcarpa", key: "ficus" },
  { scientific: "Olea europaea", key: "olive" },
  { scientific: "Ceratonia siliqua", key: "carob" },
  { scientific: "Phoenix dactylifera", key: "datePalm" },
  { scientific: "Platanus orientalis", key: "plane" },
  { scientific: "Jacaranda mimosifolia", key: "jacaranda" },
  { scientific: "Tipuana tipu", key: "tipu" },
  { scientific: "Melia azedarach", key: "chinaberry" },
  { scientific: "Brachychiton populneus", key: "kurrajong" },
];

/** The name to show for a species, in the current language. */
export function speciesName(scientific: string | null | undefined): string {
  if (!scientific) return "";
  const genus = scientific.split(" ")[0]?.toLowerCase();
  const entry =
    CATALOGUE.find((s) => s.scientific === scientific) ??
    // "Ficus nitida" is still a ficus to a person on the street.
    CATALOGUE.find((s) => s.scientific.split(" ")[0]?.toLowerCase() === genus);
  return entry ? t.collection.species[entry.key] : scientific;
}
