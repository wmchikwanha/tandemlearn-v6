import { Link } from "react-router-dom";
import { ArrowLeft, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Footer from "@/components/Footer";

const Privacy = () => {
  const lastUpdated = "January 2026";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        <Card className="mb-8">
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">
              TandemLearn™ — Last Updated: {lastUpdated}
            </p>
          </CardHeader>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                <strong>DRAFT DOCUMENT</strong> — This document is pending legal review and is provided for informational purposes only. Final policy will be established upon formal legal counsel review.
              </AlertDescription>
            </Alert>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                TandemLearn™ ("we", "our", or "the Service") is committed to protecting your privacy and personal data. This Privacy Policy explains how we collect, use, store, and protect information when you use our educational transcription platform. We are committed to compliance with applicable data protection laws including GDPR, POPIA (Protection of Personal Information Act), and other relevant regulations.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <div>
                  <h3 className="font-medium text-foreground mb-2">Account Information</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Name and email address</li>
                    <li>Role (teacher, student, administrator)</li>
                    <li>Institutional affiliation (if applicable)</li>
                    <li>Account credentials (encrypted)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">Educational Data</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Lesson schedules and timetables</li>
                    <li>Class assignments and enrollments</li>
                    <li>Transcription content from live sessions</li>
                    <li>Saved transcripts and learning materials</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">Technical Data</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Device and browser information</li>
                    <li>IP address and approximate location</li>
                    <li>Usage patterns and session data</li>
                    <li>Error logs and performance data</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>We use collected information to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide and maintain the transcription service</li>
                  <li>Authenticate users and manage access</li>
                  <li>Enable real-time classroom communication</li>
                  <li>Store and retrieve saved transcripts</li>
                  <li>Improve service quality and accessibility</li>
                  <li>Send essential service notifications</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">4. Data Storage and Security</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>We implement industry-standard security measures including:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Encryption in transit (TLS/SSL) and at rest</li>
                  <li>Secure authentication with password hashing</li>
                  <li>Row-level security for database access</li>
                  <li>Regular security audits and updates</li>
                  <li>Access controls and audit logging</li>
                </ul>
                <p className="mt-4">
                  Data is stored on secure cloud infrastructure. For institutional deployments, data residency requirements can be accommodated through separate agreements.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">5. Third-Party Services</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>We use trusted third-party services to provide functionality:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Cloud Infrastructure:</strong> Secure database and file storage</li>
                  <li><strong>Video Streaming:</strong> Real-time video communication services</li>
                  <li><strong>Email Services:</strong> Transactional emails and notifications</li>
                </ul>
                <p className="mt-4">
                  All third-party providers are selected for their security and privacy practices and are bound by appropriate data processing agreements.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>We retain data according to the following principles:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Account Data:</strong> Retained while account is active, plus 30 days after deletion request</li>
                  <li><strong>Live Transcriptions:</strong> Temporary storage during session, then deleted unless saved</li>
                  <li><strong>Saved Transcripts:</strong> Retained until user deletes them</li>
                  <li><strong>Logs and Analytics:</strong> Retained for up to 12 months for service improvement</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">7. Children's Privacy</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  We take children's privacy seriously. Please refer to our <Link to="/safeguarding" className="text-primary hover:underline">Safeguarding Policy</Link> for detailed information about how we protect minors.
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Users under 18 require parental or guardian consent</li>
                  <li>We collect only information necessary for educational purposes</li>
                  <li>Parental controls and oversight are supported</li>
                  <li>We do not knowingly collect data from children under 13 without verified parental consent</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">8. Your Rights</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Access:</strong> Request a copy of your personal data</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                  <li><strong>Deletion:</strong> Request deletion of your data (subject to legal requirements)</li>
                  <li><strong>Portability:</strong> Receive your data in a portable format</li>
                  <li><strong>Restriction:</strong> Request limitation of processing</li>
                  <li><strong>Objection:</strong> Object to certain types of processing</li>
                  <li><strong>Withdraw Consent:</strong> Withdraw previously given consent</li>
                </ul>
                <p className="mt-4">
                  To exercise these rights, please contact us using the details below.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">9. International Data Transfers</h2>
              <p className="text-muted-foreground leading-relaxed">
                If your data is transferred outside your country of residence, we ensure appropriate safeguards are in place, including standard contractual clauses or other legally recognized transfer mechanisms. For institutional deployments, specific data residency requirements can be accommodated.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">10. Updates to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy periodically. Material changes will be communicated via email or through prominent notice in the Service. We encourage you to review this policy regularly.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                For privacy-related questions or to exercise your data rights, contact us at:<br />
                <span className="font-medium">[Data Protection Contact to be provided]</span>
              </p>
            </section>

            <div className="border-t pt-6 mt-8">
              <p className="text-sm text-muted-foreground text-center">
                TandemLearn™ is a product of the Joint Venture. All rights reserved.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4 text-sm text-muted-foreground">
          <Link to="/terms" className="hover:text-primary hover:underline">Terms of Service</Link>
          <span>•</span>
          <Link to="/safeguarding" className="hover:text-primary hover:underline">Safeguarding Policy</Link>
          <span>•</span>
          <Link to="/accessibility" className="hover:text-primary hover:underline">Accessibility</Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Privacy;
