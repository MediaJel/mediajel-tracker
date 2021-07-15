export default function parseJson(string) {
  let result;
  try {
    result = JSON.parse(string);
  } catch (e) {
    result = null;
  }
  return result;
}