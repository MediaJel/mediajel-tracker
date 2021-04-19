import { setEnvironment } from './Environments/Environments';
let environmentPath = window.location.pathname.substring(1).toLowerCase();
window.onload = setEnvironment(environmentPath);
