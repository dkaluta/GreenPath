import { z } from "zod";

/*
 * Usernames are pseudonymous and generated: three random English words
 * separated by spaces, like "gentle shady olive". People do not type their
 * own, so a real name or an email can never end up as a username. See
 * "Usernames are pseudonymous" in docs/00-product.markdown.
 *
 * The same rule is in the database, in supabase/migrations/*_profiles.sql -
 * change both together.
 */

export const USERNAME_MAX = 40;

/** Lowercase English words, one space between them, two to four words. */
const USERNAME_PATTERN = /^[a-z]+(?: [a-z]+){1,3}$/;

export const usernameSchema = z
  .string()
  .max(USERNAME_MAX, "Username is too long")
  .regex(USERNAME_PATTERN, "Username must be lowercase words");

/** What the API returns about a person. Nothing else about them, ever. */
export const profileSchema = z.object({
  id: z.string(),
  username: usernameSchema,
});

// Calm, friendly words only. Nothing that could read as an insult when
// combined, and nothing about a person's body, age or origin.
const MOODS = [
  "calm",
  "gentle",
  "quiet",
  "bright",
  "brave",
  "kind",
  "merry",
  "patient",
  "curious",
  "steady",
  "humble",
  "lucky",
  "sunny",
  "breezy",
  "cheerful",
  "clever",
  "cosy",
  "eager",
  "jolly",
  "keen",
  "lively",
  "mellow",
  "nimble",
  "playful",
  "proud",
  "restful",
  "serene",
  "sleepy",
  "spry",
  "swift",
  "tidy",
  "wise",
  "witty",
  "wandering",
  "dreamy",
  "hopeful",
];

const NATURE = [
  "shady",
  "leafy",
  "mossy",
  "dewy",
  "green",
  "golden",
  "amber",
  "silver",
  "misty",
  "rustling",
  "blooming",
  "sprouting",
  "rooted",
  "dappled",
  "twilight",
  "morning",
  "evening",
  "autumn",
  "spring",
  "summer",
  "winter",
  "windy",
  "rainy",
  "cloudy",
  "starry",
  "sandy",
  "stony",
  "woody",
  "grassy",
  "flowering",
  "budding",
  "fern",
  "willow",
  "cedar",
  "citrus",
  "honey",
];

const THINGS = [
  "olive",
  "carob",
  "ficus",
  "jacaranda",
  "sycamore",
  "palm",
  "oak",
  "pine",
  "cypress",
  "almond",
  "fig",
  "pomegranate",
  "acacia",
  "eucalyptus",
  "plane",
  "poplar",
  "willow",
  "maple",
  "laurel",
  "myrtle",
  "walker",
  "wanderer",
  "rambler",
  "stroller",
  "sparrow",
  "hoopoe",
  "bulbul",
  "finch",
  "robin",
  "owl",
  "hedgehog",
  "gecko",
  "tortoise",
  "squirrel",
  "acorn",
  "pinecone",
];

/**
 * Makes up a username like "gentle shady olive". There are about 46,000
 * combinations; the database's unique index catches the rare clash, and the
 * caller picks again. `random` is there so tests can pin it; leave it out
 * in real code.
 */
export function generateUsername(random: () => number = Math.random): string {
  const pick = (words: readonly string[]) =>
    words[Math.floor(random() * words.length)];
  return `${pick(MOODS)} ${pick(NATURE)} ${pick(THINGS)}`;
}

export type Profile = z.infer<typeof profileSchema>;
