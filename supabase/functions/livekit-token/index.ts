import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// LiveKit token generation using JWT
async function createLiveKitToken(
  apiKey: string,
  apiSecret: string,
  roomName: string,
  participantIdentity: string,
  participantName: string,
  canPublish: boolean,
  canSubscribe: boolean
): Promise<string> {
  const encoder = new TextEncoder();
  
  // Create JWT header
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  
  // Create JWT payload with LiveKit claims
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: apiKey,
    sub: participantIdentity,
    name: participantName,
    nbf: now,
    exp: now + 3600, // 1 hour expiry
    iat: now,
    video: {
      roomJoin: true,
      room: roomName,
      canPublish: canPublish,
      canSubscribe: canSubscribe,
      canPublishData: true,
    }
  };
  
  // Base64URL encode
  const base64UrlEncode = (data: Uint8Array): string => {
    const base64 = btoa(String.fromCharCode(...data));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  
  const signatureInput = `${headerB64}.${payloadB64}`;
  
  // Sign with HMAC-SHA256
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signatureInput)
  );
  
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY');
    const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET');
    const LIVEKIT_URL = Deno.env.get('LIVEKIT_URL');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      console.error('LiveKit credentials not configured');
      throw new Error('LiveKit credentials not configured');
    }

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify user - extract JWT and verify it
    const token = authHeader.replace('Bearer ', '');
    
    // Use the admin auth API to get user from JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError?.message || 'No user found');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('User authenticated:', user.id);

    const { lessonId, role } = await req.json();

    if (!lessonId || !role) {
      return new Response(JSON.stringify({ error: 'Missing lessonId or role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's role
    const { data: userRoleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const userRole = userRoleData?.role;

    // Get user's profile for display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const displayName = profile?.full_name || profile?.email || 'Participant';

    // Validate access based on role
    if (role === 'publisher') {
      // Teachers/admins can publish freely; students can publish only when unmuted (have the floor)
      if (userRole === 'teacher' || userRole === 'admin') {
        // Verify teacher owns the lesson or is admin
        const { data: lesson } = await supabase
          .from('lessons')
          .select('teacher_id, session_name')
          .eq('id', lessonId)
          .single();

        if (!lesson) {
          return new Response(JSON.stringify({ error: 'Lesson not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (userRole !== 'admin' && lesson.teacher_id !== user.id) {
          return new Response(JSON.stringify({ error: 'You do not own this lesson' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else if (userRole === 'student') {
        // Student can publish video only if they currently have the floor (is_unmuted=true)
        const { data: lesson } = await supabase
          .from('lessons')
          .select('session_name')
          .eq('id', lessonId)
          .single();

        if (!lesson) {
          return new Response(JSON.stringify({ error: 'Lesson not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Verify enrollment
        const { data: enrollment } = await supabase
          .from('lesson_assignments')
          .select('id')
          .eq('lesson_id', lessonId)
          .eq('student_id', user.id)
          .single();

        if (!enrollment) {
          return new Response(JSON.stringify({ error: 'You are not enrolled in this lesson' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Verify currently unmuted (has the floor)
        const { data: participant } = await supabase
          .from('session_participants')
          .select('is_unmuted')
          .eq('session_name', lesson.session_name)
          .eq('user_id', user.id)
          .single();

        if (!participant?.is_unmuted) {
          return new Response(JSON.stringify({ error: 'You do not have the floor. Raise hand and wait to be unmuted.' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        return new Response(JSON.stringify({ error: 'Not authorized to publish' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (role === 'subscriber') {
      // Students must be enrolled in the lesson
      if (userRole === 'student') {
        const { data: enrollment } = await supabase
          .from('lesson_assignments')
          .select('id')
          .eq('lesson_id', lessonId)
          .eq('student_id', user.id)
          .single();

        if (!enrollment) {
          return new Response(JSON.stringify({ error: 'You are not enrolled in this lesson' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    const roomName = `lesson_${lessonId}`;
    const canPublish = role === 'publisher';
    const canSubscribe = true;

    // Use role-suffixed identity so the same user can simultaneously publish and
    // subscribe (LiveKit kicks any prior connection with a duplicate identity).
    // Subscriber identity also gets a short random suffix so multiple tabs/devices
    // viewing the same lesson don't evict each other.
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const participantIdentity =
      role === 'publisher'
        ? `${user.id}__pub`
        : `${user.id}__sub_${randomSuffix}`;

    console.log(`Creating token for ${participantIdentity} in room ${roomName}, role: ${role}`);

    const accessToken = await createLiveKitToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      roomName,
      participantIdentity,
      displayName,
      canPublish,
      canSubscribe
    );

    return new Response(JSON.stringify({ 
      token: accessToken,
      url: LIVEKIT_URL,
      roomName
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in livekit-token function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
