import keyWords from "../../constants/key-words";

// Returns string if matches an index in the array
export default function getBasedOn(context: string): Boolean {
  const result = keyWords.some((key: string) => context.includes(key));

  return result;
}
