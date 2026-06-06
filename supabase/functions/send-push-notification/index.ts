import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Web Push library for Deno
async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    // Import web-push compatible library
    const encoder = new TextEncoder();
    
    // Create JWT for VAPID
    const header = { alg: "ES256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      aud: new URL(subscription.endpoint).origin,
      exp: now + 12 * 60 * 60, // 12 hours
      sub: "mailto:admin@tandemlearn.app"
    };

    // For simplicity, we'll use fetch with the subscription endpoint directly
    // In production, you'd want to use proper VAPID signing
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
      },
      body: encoder.encode(payload)
    });

    console.log(`Push sent to ${subscription.endpoint}: ${response.status}`);
    return response.ok || response.status === 201;
  } catch (error) {
    console.error('Error sending push:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionName, teacherName, title } = await req.json();
    
    console.log(`Sending push notifications for session: ${sessionName}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all push subscriptions for students
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions`);

    const payload = JSON.stringify({
      title: `🎓 ${title || 'Live Session Starting'}`,
      body: `${teacherName || 'Your teacher'} has started a live session: ${sessionName}`,
      icon: '/pwa-192x192.svg',
      badge: '/pwa-192x192.svg',
      data: {
        url: `/student?session=${encodeURIComponent(sessionName)}`,
        sessionName
      }
    });

    let successCount = 0;
    let failCount = 0;

    // Send to all subscriptions
    for (const sub of subscriptions || []) {
      try {
        // Use the Web Push protocol
        const pushEndpoint = sub.endpoint;
        
        // Simple fetch to the push endpoint
        // Note: In production, you'd use proper encryption with p256dh and auth keys
        const response = await fetch(pushEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'TTL': '86400',
          },
          body: payload
        });

        if (response.ok || response.status === 201) {
          successCount++;
          console.log(`Push sent successfully to user ${sub.user_id}`);
        } else {
          failCount++;
          console.log(`Push failed for user ${sub.user_id}: ${response.status}`);
          
          // Remove invalid subscriptions (410 Gone or 404 Not Found)
          if (response.status === 410 || response.status === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
            console.log(`Removed invalid subscription ${sub.id}`);
          }
        }
      } catch (err) {
        failCount++;
        console.error(`Error sending to ${sub.user_id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount,
        total: subscriptions?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
