import { Jane } from './Jane/Jane';

export function setEnvironment(argURL) {
  argURL === 'jane' && Jane();
}
