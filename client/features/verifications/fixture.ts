import type { StopTree } from "./flow";

/**
 * A tree to check until the routing work supplies real ones. The stop
 * screen uses it when navigation hands it no tree:
 *
 *     navigate("/navigate/stop", { state: { tree } });   // a real StopTree
 *
 * A ficus on Katznelson Street in Givatayim, the pilot city. The id is
 * made up in the יע"ד style; the street name is data, so it stays in Hebrew.
 */
export const FIXTURE_TREE: StopTree = {
  id: "yaad-givatayim-fixture-0001",
  species: "Ficus microcarpa",
  street: "כצנלסון",
  houseNumber: "12",
  lat: 32.0712,
  lng: 34.8103,
  side: "left",
  distanceM: 8,
  referenceImageUrl: null,
};
