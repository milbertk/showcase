import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  auth,
  googleProvider,
  facebookProvider,
  microsoftProvider,
} from "../../../shared/firebase/firebase";

// Sign in with email/password -> returns the Firebase ID token.
export async function firebaseEmailLogin(email, password) {
  await setPersistence(auth, browserLocalPersistence);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return { user: cred.user, idToken: await cred.user.getIdToken() };
}

// Register with email/password -> returns the Firebase ID token.
export async function firebaseEmailRegister(email, password) {
  await setPersistence(auth, browserLocalPersistence);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return { user: cred.user, idToken: await cred.user.getIdToken() };
}

// Social sign-in. Only the providers wired in your firebase config will work;
// Apple is not configured yet (same as the main app).
const PROVIDERS = {
  google: googleProvider,
  facebook: facebookProvider,
  microsoft: microsoftProvider,
};

export async function firebaseSocialLogin(providerId) {
  const provider = PROVIDERS[providerId];
  if (!provider) {
    // apple (or any not-configured provider)
    throw new Error(`Provider "${providerId}" is not available yet.`);
  }
  await setPersistence(auth, browserLocalPersistence);
  const cred = await signInWithPopup(auth, provider);
  return { user: cred.user, idToken: await cred.user.getIdToken() };
}

// Send the Firebase "reset your password" email. Firebase does not tell us
// whether the email exists (good: nobody can test which emails are registered).
export async function firebasePasswordReset(email) {
  await sendPasswordResetEmail(auth, email);
}

// Sign out from Firebase on the client.
export async function firebaseSignOut() {
  try {
    await signOut(auth);
  } catch {
    // best-effort
  }
}