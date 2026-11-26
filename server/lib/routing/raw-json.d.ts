/*
 * The cities' data files are imported as text (`?raw`, a Vite feature) and
 * parsed with JSON.parse when a request first needs them. Importing them as
 * JSON modules would make TypeScript infer a type for megabytes of numbers.
 */
declare module "*.json?raw" {
  const text: string;
  export default text;
}
