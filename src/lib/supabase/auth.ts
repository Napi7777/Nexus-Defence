/** Sign-up, sign-in, sign-out and password management (SRS 3.2). */
import { getSupabaseClient } from './client';

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
  role: 'learner' | 'tutor' = 'learner'
) {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: new Error('Supabase not configured') };
  const res = await client.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
    },
  });

  if (res.data?.user) {
    try {
      // Upsert app-level profile fields. (Trigger handle_new_user already created the base row)
      await client.from('profiles').upsert([
        {
          id: res.data.user.id,
          full_name: fullName,
          university: 'KNUST',
          bio: 'Member of NEXUS Learning Commons.',
        },
      ]);
    } catch (err) {
      console.warn('Profile upsert warning:', err);
    }
  }

  return res;
}

export async function signInWithEmail(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: new Error('Supabase not configured') };
  return client.auth.signInWithPassword({ email, password });
}

export async function signOutUser() {
  const client = getSupabaseClient();
  if (!client) return { error: null };
  return client.auth.signOut();
}

export async function getCurrentSession() {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session;
}

/**
 * Changes the signed-in user's password.
 *
 * The current password is re-checked first: Supabase's updateUser does not
 * require it, so without this anyone holding an unlocked phone could change
 * the password and take over the account.
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  const client = getSupabaseClient();
  if (!client) return { error: new Error('Supabase not configured') };

  const { data: userData } = await client.auth.getUser();
  const email = userData?.user?.email;
  if (!email) return { error: new Error('Your session expired. Sign in and try again.') };

  const { error: reauthError } = await client.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (reauthError) return { error: new Error('Your current password is incorrect.') };

  const { error } = await client.auth.updateUser({ password: newPassword });
  return { error };
}

/** Sends a password reset email. */
export async function sendPasswordReset(email: string) {
  const client = getSupabaseClient();
  if (!client) return { error: new Error('Supabase not configured') };
  return client.auth.resetPasswordForEmail(email.trim());
}
