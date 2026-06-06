import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Memorable password generation
const adjectives = [
  'happy', 'bright', 'swift', 'clever', 'brave', 'calm', 'kind', 'bold', 'wise', 'quick',
  'sunny', 'proud', 'warm', 'cool', 'smart', 'lucky', 'neat', 'fair', 'keen', 'jolly'
];

const nouns = [
  'tiger', 'eagle', 'dolphin', 'panda', 'falcon', 'lion', 'bear', 'wolf', 'fox', 'owl',
  'rabbit', 'koala', 'penguin', 'whale', 'horse', 'deer', 'swan', 'hawk', 'seal', 'otter'
];

function generatePassword(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 90) + 10; // 10-99
  return `${adj}-${noun}-${num}`;
}

function generateUsername(identifier: string, schoolCode?: string): string {
  const cleanId = identifier.toLowerCase().replace(/[^a-z0-9]/g, '');
  const prefix = schoolCode ? `${schoolCode.toLowerCase()}-` : '';
  return `${prefix}${cleanId}@tandemlearn.school`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the authorization header to identify the teacher
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create a client with the user's token to get their ID
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const teacherId = user.id;

    // Verify user is a teacher or admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', teacherId)
      .in('role', ['teacher', 'admin'])
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error('Only teachers or admins can bulk create students');
    }

    const isAdmin = roleData.role === 'admin';
    const { students, schoolCode, targetTeacherId } = await req.json();

    // If admin provides a target teacher, use that; otherwise use their own ID
    const assignToTeacherId = isAdmin && targetTeacherId ? targetTeacherId : teacherId;

    if (!students || !Array.isArray(students) || students.length === 0) {
      throw new Error('No students provided');
    }

    if (students.length > 500) {
      throw new Error('Maximum 500 students per batch');
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const results: any[] = [];
    let created = 0;
    let failed = 0;

    console.log(`Processing batch ${batchId} with ${students.length} students`);

    for (const student of students) {
      const { name, identifier } = student;
      
      if (!name || !identifier) {
        results.push({
          name: name || 'Unknown',
          identifier: identifier || 'Missing',
          status: 'failed',
          error: 'Missing name or identifier'
        });
        failed++;
        continue;
      }

      const username = generateUsername(identifier, schoolCode);
      const password = generatePassword();

      try {
        // Check if username already exists
        const { data: existingUser } = await supabaseAdmin
          .from('pre_registered_students')
          .select('id')
          .eq('login_username', username)
          .maybeSingle();

        if (existingUser) {
          results.push({
            name,
            identifier,
            username,
            status: 'failed',
            error: 'Username already exists'
          });
          failed++;
          continue;
        }

        // Create auth user with admin API
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: username,
          password: password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            full_name: name,
            student_identifier: identifier,
            created_by_teacher: teacherId
          }
        });

        if (authError) {
          console.error(`Error creating user ${username}:`, authError);
          
          // Store failed record
          await supabaseAdmin.from('pre_registered_students').insert({
            teacher_id: teacherId,
            student_name: name,
            student_identifier: identifier,
            login_username: username,
            batch_id: batchId,
            status: 'failed',
            error_message: authError.message
          });

          results.push({
            name,
            identifier,
            username,
            status: 'failed',
            error: authError.message
          });
          failed++;
          continue;
        }

        const newUserId = authData.user.id;

        // Create profile
        await supabaseAdmin.from('profiles').insert({
          id: newUserId,
          email: username,
          full_name: name
        });

        // Assign student role
        await supabaseAdmin.from('user_roles').insert({
          user_id: newUserId,
          role: 'student'
        });

        // Link to teacher (target teacher for admins, or self)
        await supabaseAdmin.from('teacher_students').insert({
          teacher_id: assignToTeacherId,
          student_id: newUserId
        });

        // Store pre-registered record with temp password
        await supabaseAdmin.from('pre_registered_students').insert({
          teacher_id: assignToTeacherId,
          student_name: name,
          student_identifier: identifier,
          login_username: username,
          temp_password: password, // Store temporarily for credential download
          batch_id: batchId,
          status: 'activated',
          user_id: newUserId,
          activated_at: new Date().toISOString()
        });

        results.push({
          name,
          identifier,
          username,
          password,
          status: 'created'
        });
        created++;

      } catch (error: any) {
        console.error(`Error processing student ${name}:`, error);
        results.push({
          name,
          identifier,
          username,
          status: 'failed',
          error: error.message
        });
        failed++;
      }
    }

    console.log(`Batch ${batchId} complete: ${created} created, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        batchId,
        results,
        summary: {
          total: students.length,
          created,
          failed
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Bulk create students error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
