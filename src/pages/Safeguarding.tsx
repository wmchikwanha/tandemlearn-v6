import { Link } from "react-router-dom";
import { ArrowLeft, Heart, AlertTriangle, Users, ShieldCheck, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Footer from "@/components/Footer";

const Safeguarding = () => {
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
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl">Safeguarding & Child Protection Policy</CardTitle>
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

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-8">
              <p className="text-primary font-medium text-center">
                The safety and wellbeing of children and young people is our highest priority.
              </p>
            </div>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                1. Our Commitment
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                TandemLearn™ is committed to creating a safe educational environment for all users, with particular attention to the protection of children and vulnerable individuals. We recognise our responsibility to safeguard users from abuse, neglect, and exploitation, and to promote their welfare within our platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                2. Age Requirements and Consent
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Users aged 18+:</strong> May register independently</li>
                  <li><strong>Users aged 13-17:</strong> Require parental or guardian consent to register</li>
                  <li><strong>Users under 13:</strong> Must have accounts created and supervised by a parent, guardian, or educational institution</li>
                </ul>
                <p className="mt-4">
                  All users must confirm they meet age requirements or have appropriate consent during registration.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">3. Institutional Responsibility</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  When TandemLearn™ is deployed by an educational institution, the institution retains primary responsibility for:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Obtaining appropriate parental consent for minor students</li>
                  <li>Supervising student use of the platform</li>
                  <li>Training staff on appropriate use and safeguarding</li>
                  <li>Responding to safeguarding concerns according to their policies</li>
                  <li>Ensuring compliance with local child protection laws</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">4. Data Protection for Minors</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>We implement additional protections for data relating to minors:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Data Minimisation:</strong> We collect only essential educational data</li>
                  <li><strong>No Marketing:</strong> Minors are never targeted with marketing communications</li>
                  <li><strong>No Profiling:</strong> We do not create behavioural profiles of minor users</li>
                  <li><strong>Parental Access:</strong> Parents/guardians may request access to their child's data</li>
                  <li><strong>Right to Deletion:</strong> Enhanced deletion rights for data collected from minors</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">5. Safe Platform Design</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>Our platform incorporates safety by design:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Controlled Access:</strong> Sessions are accessible only to enrolled participants</li>
                  <li><strong>Teacher Oversight:</strong> Teachers maintain control of classroom sessions</li>
                  <li><strong>No Public Content:</strong> Educational content is not publicly accessible</li>
                  <li><strong>Audit Logging:</strong> All significant actions are logged for accountability</li>
                  <li><strong>Session Management:</strong> Teachers can remove participants if necessary</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">6. Prohibited Conduct</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>The following conduct is strictly prohibited and will result in immediate account termination and, where appropriate, reporting to authorities:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Any form of abuse, harassment, or bullying</li>
                  <li>Sharing inappropriate, harmful, or illegal content</li>
                  <li>Grooming or attempts to contact minors inappropriately</li>
                  <li>Sharing personal information of minors without consent</li>
                  <li>Recording sessions without appropriate consent</li>
                  <li>Any exploitation of children or vulnerable persons</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">7. Teacher and Staff Responsibilities</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>Teachers and institutional staff using TandemLearn™ are expected to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Adhere to their institution's safeguarding policies</li>
                  <li>Maintain professional boundaries with students</li>
                  <li>Report any safeguarding concerns through appropriate channels</li>
                  <li>Not share login credentials or allow unauthorized access</li>
                  <li>Supervise student activity during live sessions</li>
                  <li>Model appropriate online behaviour</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                8. Reporting Concerns
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>If you have safeguarding concerns:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Immediate Danger:</strong> Contact local emergency services immediately</li>
                  <li><strong>Institutional Users:</strong> Follow your institution's safeguarding reporting procedures</li>
                  <li><strong>Platform Concerns:</strong> Contact us at [Safeguarding Contact to be provided]</li>
                </ul>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mt-4">
                  <p className="text-destructive font-medium">
                    If a child is in immediate danger, always contact local emergency services first.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">9. Incident Response</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>When a safeguarding concern is reported to us, we will:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Acknowledge receipt within 24 hours</li>
                  <li>Take immediate protective action if necessary (e.g., account suspension)</li>
                  <li>Cooperate with relevant authorities and institutions</li>
                  <li>Document and review the incident</li>
                  <li>Implement any necessary platform improvements</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">10. Regular Review</h2>
              <p className="text-muted-foreground leading-relaxed">
                This safeguarding policy is reviewed annually and updated to reflect changes in legislation, best practices, and lessons learned from incidents. All staff involved in platform operations receive regular safeguarding training.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">11. Compliance</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>This policy is designed to comply with:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>UN Convention on the Rights of the Child</li>
                  <li>COPPA (Children's Online Privacy Protection Act) - USA</li>
                  <li>GDPR Article 8 (Conditions applicable to child's consent) - EU</li>
                  <li>POPIA (Protection of Personal Information Act) - South Africa</li>
                  <li>Children's Act - South Africa</li>
                  <li>Local child protection legislation in deployment jurisdictions</li>
                </ul>
              </div>
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
          <Link to="/privacy" className="hover:text-primary hover:underline">Privacy Policy</Link>
          <span>•</span>
          <Link to="/accessibility" className="hover:text-primary hover:underline">Accessibility</Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Safeguarding;
