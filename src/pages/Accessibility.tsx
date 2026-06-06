import { Link } from "react-router-dom";
import { ArrowLeft, Accessibility as AccessibilityIcon, Check, Headphones, Eye, MousePointer, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/Footer";

const Accessibility = () => {
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
              <AccessibilityIcon className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl">Accessibility Statement</CardTitle>
            <p className="text-sm text-muted-foreground">
              TandemLearn™ — Last Updated: {lastUpdated}
            </p>
          </CardHeader>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-8">
              <p className="text-primary font-medium text-center">
                TandemLearn™ is built with accessibility at its core — designed to make education inclusive for all learners.
              </p>
            </div>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Our Commitment</h2>
              <p className="text-muted-foreground leading-relaxed">
                TandemLearn™ was created specifically to improve accessibility in education. We are committed to ensuring that our platform is accessible to all users, regardless of ability or disability. Our core mission — providing real-time transcription — directly addresses the needs of deaf and hard-of-hearing students, and we extend this commitment to all aspects of our platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Accessibility Standards</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>We strive to meet or exceed:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>WCAG 2.1 Level AA:</strong> Web Content Accessibility Guidelines</li>
                  <li><strong>Section 508:</strong> US accessibility requirements for federal agencies</li>
                  <li><strong>EN 301 549:</strong> European accessibility standard for ICT</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <Headphones className="h-5 w-5 text-primary" />
                Accessibility Features
              </h2>
              
              <div className="grid gap-4 mt-4">
                <div className="bg-card border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Real-Time Transcription
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Live speech-to-text transcription provides immediate access to spoken content for deaf and hard-of-hearing users.
                  </p>
                </div>

                <div className="bg-card border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Sign Language Video
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Support for sign language video streaming allows teachers to communicate visually alongside spoken instruction.
                  </p>
                </div>

                <div className="bg-card border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Text-to-Speech
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Built-in text-to-speech functionality helps users with visual impairments or reading difficulties.
                  </p>
                </div>

                <div className="bg-card border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    High Contrast Mode
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Adjustable contrast settings and dark mode support for users with visual sensitivities.
                  </p>
                </div>

                <div className="bg-card border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Adjustable Text Size
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Customizable font sizes throughout the application via the accessibility menu.
                  </p>
                </div>

                <div className="bg-card border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Keyboard Navigation
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Full keyboard navigation support for users who cannot use a mouse.
                  </p>
                </div>

                <div className="bg-card border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Screen Reader Compatibility
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Semantic HTML and ARIA labels ensure compatibility with screen readers like NVDA, JAWS, and VoiceOver.
                  </p>
                </div>

                <div className="bg-card border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Offline Support
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Progressive Web App (PWA) functionality allows offline access to saved transcripts and materials.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Visual Accessibility
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <ul className="list-disc pl-6 space-y-2">
                  <li>Colour contrast ratios meet WCAG AA standards (4.5:1 minimum)</li>
                  <li>Information is not conveyed by colour alone</li>
                  <li>Focus indicators are clearly visible</li>
                  <li>Animations can be reduced for users with vestibular disorders</li>
                  <li>Responsive design works on all screen sizes</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-primary" />
                Keyboard & Motor Accessibility
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <ul className="list-disc pl-6 space-y-2">
                  <li>All functionality is available via keyboard</li>
                  <li>No keyboard traps exist in the interface</li>
                  <li>Skip links are provided for navigation</li>
                  <li>Touch targets are adequately sized for motor-impaired users</li>
                  <li>No time limits that cannot be extended</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <MousePointer className="h-5 w-5 text-primary" />
                Assistive Technology Testing
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>We regularly test with:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>NVDA (Windows screen reader)</li>
                  <li>VoiceOver (macOS/iOS screen reader)</li>
                  <li>TalkBack (Android screen reader)</li>
                  <li>Keyboard-only navigation</li>
                  <li>Various zoom and magnification tools</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Known Limitations</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>We are actively working to address the following areas:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Third-party video components may have limited accessibility features</li>
                  <li>Some complex data visualizations may require additional description</li>
                  <li>Live transcription accuracy varies based on audio quality and speaker clarity</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Feedback & Support</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  We welcome feedback on accessibility. If you encounter barriers or have suggestions for improvement:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Email us at: [Accessibility Contact to be provided]</li>
                  <li>Use the in-app feedback feature</li>
                </ul>
                <p className="mt-4">
                  We aim to respond to accessibility feedback within 5 business days and resolve issues as quickly as possible.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Continuous Improvement</h2>
              <p className="text-muted-foreground leading-relaxed">
                Accessibility is an ongoing commitment. We conduct regular accessibility audits, include accessibility testing in our development process, and consult with users with disabilities to ensure our platform meets real-world needs.
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
          <Link to="/privacy" className="hover:text-primary hover:underline">Privacy Policy</Link>
          <span>•</span>
          <Link to="/safeguarding" className="hover:text-primary hover:underline">Safeguarding Policy</Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Accessibility;
