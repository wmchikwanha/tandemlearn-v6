import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  teacherName: string;
  teacherId: string;
}

// Generate a secure random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, teacherName, teacherId }: InvitationRequest = await req.json();

    console.log(`Processing invitation request for email: ${email}, teacher: ${teacherName}`);

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if email is already registered as a student
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      // Check if already linked to this teacher
      const { data: existingLink } = await supabase
        .from("teacher_students")
        .select("id")
        .eq("teacher_id", teacherId)
        .eq("student_id", existingProfile.id)
        .maybeSingle();

      if (existingLink) {
        return new Response(
          JSON.stringify({ error: "This student is already linked to you" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabase
      .from("student_invitations")
      .select("id, status")
      .eq("teacher_id", teacherId)
      .eq("invited_email", email.toLowerCase())
      .eq("status", "pending")
      .maybeSingle();

    if (existingInvitation) {
      return new Response(
        JSON.stringify({ error: "An invitation is already pending for this email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate invitation token
    const invitationToken = generateToken();

    // Insert invitation record
    const { error: insertError } = await supabase
      .from("student_invitations")
      .insert({
        teacher_id: teacherId,
        invited_email: email.toLowerCase(),
        invitation_token: invitationToken,
        status: "pending",
      });

    if (insertError) {
      console.error("Error inserting invitation:", insertError);
      throw new Error("Failed to create invitation");
    }

    // Build the signup URL with the invitation token
    const baseUrl = req.headers.get("origin") || "https://your-app.lovable.app";
    const signupUrl = `${baseUrl}/auth?invite=${invitationToken}`;

    console.log(`Generated signup URL: ${signupUrl}`);

    // Try to send invitation email (don't fail if email delivery fails)
    let emailSent = false;
    let emailError = null;
    
    try {
      const emailResponse = await resend.emails.send({
        from: "TandemLearn <onboarding@resend.dev>",
        to: [email],
        subject: `${teacherName} invited you to join TandemLearn`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #2a9d8f 0%, #1a7a6e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">TandemLearn™</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">The Classroom That Adapts to You</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
              <h2 style="color: #333; margin-top: 0;">You've been invited!</h2>
              
              <p style="font-size: 16px;">
                <strong>${teacherName}</strong> has invited you to join their classroom on TandemLearn, an accessible education platform with real-time transcription and learning tools.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #2a9d8f 0%, #1a7a6e 100%); color: white; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Accept Invitation & Sign Up
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                Or copy and paste this link into your browser:
                <br>
                <a href="${signupUrl}" style="color: #2a9d8f; word-break: break-all;">${signupUrl}</a>
              </p>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">
              
              <p style="color: #888; font-size: 12px; margin-bottom: 0;">
                This invitation will expire in 7 days. If you didn't expect this email, you can safely ignore it.
              </p>
            </div>
          </body>
          </html>
        `,
      });

      console.log("Email response:", emailResponse);
      
      // Check if email was actually sent (no error in response)
      if (emailResponse.error) {
        emailError = emailResponse.error;
        console.log("Email delivery failed:", emailError);
      } else {
        emailSent = true;
        console.log("Email sent successfully");
      }
    } catch (e: any) {
      emailError = e.message;
      console.error("Email sending error:", e);
    }

    // Return success with signup URL regardless of email status
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: emailSent 
          ? "Invitation sent successfully" 
          : "Invitation created (email delivery may require domain verification)",
        invitationToken: invitationToken,
        signupUrl: signupUrl,
        emailSent: emailSent
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-student-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send invitation" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});