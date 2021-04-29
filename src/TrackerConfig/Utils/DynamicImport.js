export default async function (env) {
  switch (env) {
    case 'jane':
      const { default: func } = await import('../Platforms/JaneTracker');
      func();
      break;
  }
}
