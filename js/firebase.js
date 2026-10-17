let runtimePromise;
export function firebaseRuntime() {
  if (!runtimePromise) runtimePromise = initialize().catch(error => { runtimePromise = null; throw error; });
  return runtimePromise;
}
async function initialize() {
  const response = await fetch('/api/config');
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Python API 서버를 실행해 주세요: python server.py');
  }
  const config = await response.json();
  const [appSdk, sdk] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js')
  ]);
  const app = appSdk.getApps()[0] || appSdk.initializeApp(config.firebaseConfig);
  const auth = sdk.getAuth(app);
  if (config.authEmulator) sdk.connectAuthEmulator(auth, `http://${config.authEmulator}`, { disableWarnings: true });
  await sdk.setPersistence(auth, sdk.browserSessionPersistence);
  await auth.authStateReady();
  return { auth, sdk, config };
}
