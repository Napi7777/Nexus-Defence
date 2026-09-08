// Supabase Edge Function — mints LiveKit room tokens.
//
// Deploy:
//   supabase functions deploy livekit-token
//   supabase secrets set LIVEKIT_URL=wss://<your-project>.livekit.cloud
//   supabase secrets set LIVEKIT_API_KEY=<key>
//   supabase secrets set LIVEKIT_API_SECRET=<secret>
//
// The API secret must never reach the app. A secret shipped in a JS bundle can
// be extracted and used to join or create any room on the project, so the token
// is signed here and only the short-lived token goes to the client.

import { AccessToken } from 'https://esm.sh/livekit-server-sdk@2.9.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LIVEKIT_URL = Deno.env.get('LIVEKIT_URL')!;
const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY')!;
const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // Only signed-in users get a token — otherwise anyone could join any room.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Not signed in.' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) return json({ error: 'Not signed in.' }, 401);

    const { room, name } = await req.json();
    if (!room || typeof room !== 'string') {
      return json({ error: 'A room id is required.' }, 400);
    }

    const user = userData.user;
    const displayName =
      (typeof name === 'string' && name.trim()) ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Student';

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      // Identity is the Supabase user id, so the roster maps back to profiles.
      identity: user.id,
      name: displayName,
      ttl: '2h',
    });

    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return json({ url: LIVEKIT_URL, token: await at.toJwt() });
  } catch (err) {
    console.error('livekit-token error:', err);
    return json({ error: 'Could not issue a session token.' }, 500);
  }
});
