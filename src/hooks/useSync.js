import { supabase } from '../lib/supabase';

const SYNC_GENERATE_URL = 'https://rmabikvmjwuypmitctbw.supabase.co/functions/v1/sync-generate';
const SYNC_REDEEM_URL = 'https://rmabikvmjwuypmitctbw.supabase.co/functions/v1/sync-redeem';

export const generateSyncCode = async () => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('No active session – please refresh the page.');
  }

  const userId = session.user.id;
  const refreshToken = session.refresh_token;

  const response = await fetch(SYNC_GENERATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ userId, refreshToken }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to generate sync code');
  }
  return response.json();
};

export const redeemSyncCode = async (code) => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('No active session – please refresh the page.');
  }

  const response = await fetch(SYNC_REDEEM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Invalid or expired code');
  }

  const data = await response.json();
  console.log('🔐 Redeem response:', data); // Log the response

  // ✅ Swap session using only the refresh token (Supabase will fetch a new access token)
  const { error } = await supabase.auth.setSession({
    refresh_token: data.refresh_token,
    // access_token: '', // omit – let Supabase handle it
  });
  if (error) {
    console.error('❌ setSession error:', error);
    throw new Error('Failed to swap session: ' + error.message);
  }
  console.log('✅ Session swapped to user:', data.user_id);
  return data;
};