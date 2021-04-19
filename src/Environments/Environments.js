//TODO: Sets environment based on URL
import { Jane } from './Jane/Jane';

export function setEnvironment(argURL) {
  argURL === 'Jane' && Jane();
}
