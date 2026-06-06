import { Link } from "react-router-dom";
import { ArrowLeft, FileText, AlertTriangle, Building, Shield, Scale, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import Footer from "@/components/Footer";

const Terms = () => {
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
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">
              TandemLearn™ — Last Updated: {lastUpdated}
            </p>
          </CardHeader>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                <strong>DRAFT DOCUMENT</strong> — This document is pending legal review and is provided for informational purposes only. Final terms will be established upon formal legal counsel review.
              </AlertDescription>
            </Alert>

            {/* Individual User Terms - Sections 1-6 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using TandemLearn™ ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. These terms apply to all users, including teachers, students, administrators, and institutional representatives.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">2. Service Description</h2>
              <p className="text-muted-foreground leading-relaxed">
                TandemLearn™ is an educational technology platform providing real-time speech-to-text transcription, live video streaming, and classroom management tools designed to enhance accessibility and inclusion in educational settings. The Service is intended for use in educational institutions, training organisations, and similar learning environments.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">3. User Accounts and Responsibilities</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>Users are responsible for:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Maintaining the confidentiality of account credentials</li>
                  <li>All activities that occur under their account</li>
                  <li>Providing accurate and current registration information</li>
                  <li>Notifying us immediately of any unauthorized use</li>
                  <li>Complying with all applicable laws and regulations</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">4. Acceptable Use Policy</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>Users agree NOT to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Use the Service for any unlawful purpose</li>
                  <li>Transmit harmful, offensive, or inappropriate content</li>
                  <li>Attempt to gain unauthorized access to any part of the Service</li>
                  <li>Interfere with or disrupt the Service or servers</li>
                  <li>Record, share, or distribute content without appropriate consent</li>
                  <li>Use the Service to harass, bully, or intimidate others</li>
                  <li>Impersonate any person or entity</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">5. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                TandemLearn™, its logo, and all associated intellectual property are owned by the Joint Venture entity or its licensors. Users retain ownership of their own content but grant the Service a limited license to process, display, and store such content as necessary to provide the Service. Educational content created by teachers remains their intellectual property.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">6. Data Protection and Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your privacy is important to us. Please refer to our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for information about how we collect, use, and protect your personal data. We comply with applicable data protection laws including GDPR, POPIA, and other relevant regulations.
              </p>
            </section>

            {/* Institutional Licensing Agreement - Section 7 */}
            <Separator className="my-10" />
            
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Building className="h-8 w-8 text-primary" />
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Section 7: Institutional Licensing Agreement</h2>
                  <p className="text-sm text-muted-foreground">
                    For educational institutions, government bodies, and organisations
                  </p>
                </div>
              </div>
              <Alert className="border-primary/30 bg-primary/5">
                <Shield className="h-4 w-4 text-primary" />
                <AlertDescription className="text-foreground">
                  This section applies to educational institutions, government bodies, and organisations entering into formal licensing agreements with The Joint Venture. Individual users are not bound by these institutional terms unless acting as authorised representatives of a licensed institution.
                </AlertDescription>
              </Alert>
            </div>

            {/* 7.1 Grant of License */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-primary">7.1 Grant of License</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Subject to the terms and conditions of this Agreement, The Joint Venture ("Licensor") grants to the licensed institution ("Licensee") a limited, non-exclusive, non-transferable, and revocable license to use the TandemLearn™ platform ("Licensed Software") for internal educational purposes only.
                </p>
                <p><strong>The license grants:</strong></p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>The right to deploy and use the Licensed Software within the named institution only</li>
                  <li>Access for the agreed number of concurrent users as specified in the License Schedule</li>
                  <li>The right to configure the platform to meet institutional requirements</li>
                  <li>Access to updates and maintenance during the license term</li>
                </ul>
                <p><strong>The license does NOT grant:</strong></p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Ownership of any intellectual property rights in the Licensed Software</li>
                  <li>The right to sublicense, transfer, or assign the license to any third party</li>
                  <li>The right to use the Licensed Software for commercial resale purposes</li>
                  <li>Access to source code except where explicitly agreed in writing</li>
                </ul>
              </div>
            </section>

            {/* 7.2 Deployment Models */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-primary">7.2 Deployment Models</h3>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  The Joint Venture offers three deployment models for institutional licensing. The applicable model shall be specified in the License Schedule:
                </p>
                
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <h4 className="font-semibold text-foreground mb-2">Model A: Managed SaaS (Subdomain Deployment)</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>Institution receives a branded subdomain (e.g., schoolname.tandemlearn.app)</li>
                    <li>The Joint Venture retains full control of infrastructure and source code</li>
                    <li>Institution has no access to source code or backend systems</li>
                    <li>All updates, maintenance, and security patches provided by The Joint Venture</li>
                    <li>Recommended for institutions without dedicated IT departments</li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 border">
                  <h4 className="font-semibold text-foreground mb-2">Model B: Licensed Deployment with Retained Access</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>Institution owns their Lovable project instance</li>
                    <li>The Joint Venture maintains Collaborator access for support and updates</li>
                    <li>Institution may customise branding and limited configuration</li>
                    <li>Source code access restricted; export to external repositories prohibited</li>
                    <li>Shared responsibility for maintenance with The Joint Venture support</li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 border">
                  <h4 className="font-semibold text-foreground mb-2">Model C: Full License Transfer</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>Complete transfer of project ownership to institution</li>
                    <li>Institution assumes full responsibility for hosting, maintenance, and updates</li>
                    <li>Perpetual license for the version delivered at time of transfer</li>
                    <li>Source code protection clauses remain in full effect</li>
                    <li>Optional ongoing support available via separate agreement</li>
                    <li>Strictest contractual controls apply due to increased exposure</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 7.3 Source Code Protection */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-primary">7.3 Source Code Protection</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  The source code of TandemLearn™ constitutes proprietary trade secrets and confidential information of The Joint Venture. The Licensee acknowledges and agrees to the following restrictions:
                </p>
                
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                  <h4 className="font-semibold text-destructive mb-2">Prohibited Actions</h4>
                  <ul className="list-disc pl-6 space-y-2 text-sm">
                    <li><strong>No GitHub Export:</strong> The Licensee shall not connect, export, push, or transfer any portion of the source code to GitHub, GitLab, Bitbucket, or any other version control system or code repository, whether public or private.</li>
                    <li><strong>No Reverse Engineering:</strong> The Licensee shall not reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code from the compiled or deployed application.</li>
                    <li><strong>No Derivative Works:</strong> The Licensee shall not create derivative works based on the Licensed Software for the purpose of resale, sublicensing, or distribution to third parties.</li>
                    <li><strong>No Code Sharing:</strong> The Licensee shall not share, distribute, publish, or otherwise make available any portion of the source code to any person or entity not authorised under this Agreement.</li>
                    <li><strong>No Copying:</strong> The Licensee shall not copy the source code except for backup purposes as reasonably necessary for use of the Licensed Software.</li>
                  </ul>
                </div>

                <p className="text-sm">
                  Any code access provided under Model B or Model C is solely for the purpose of institutional deployment and maintenance. The Licensee accepts that the source code shall at all times remain the intellectual property of The Joint Venture.
                </p>
              </div>
            </section>

            {/* 7.4 Restrictions on Use */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-primary">7.4 Restrictions on Use</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>The Licensee agrees to the following restrictions:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Internal Educational Use Only:</strong> The Licensed Software may only be used for the Licensee's own internal educational activities and not for any commercial purpose.</li>
                  <li><strong>No Commercial Resale:</strong> The Licensee shall not resell, sublicense, lease, rent, or otherwise commercially exploit the Licensed Software.</li>
                  <li><strong>No White-Labelling Without Consent:</strong> The Licensee shall not rebrand or white-label the Licensed Software without prior written consent from The Joint Venture.</li>
                  <li><strong>Trademark Preservation:</strong> The Licensee shall not remove, alter, or obscure any copyright notices, trademark notices, or other proprietary notices included in the Licensed Software.</li>
                  <li><strong>Geographic Restrictions:</strong> The license is limited to the institution's primary country of operation unless otherwise specified in the License Schedule.</li>
                  <li><strong>User Limits:</strong> The Licensee shall not exceed the maximum number of users specified in the License Schedule.</li>
                </ul>
              </div>
            </section>

            {/* 7.5 Support and Maintenance */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-primary">7.5 Support and Maintenance</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Support and maintenance services vary by deployment model and are subject to the terms specified in the License Schedule:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Model A (Managed SaaS):</strong> Full support included. The Joint Venture provides all updates, security patches, and technical assistance. Response times as specified in service level agreement.</li>
                  <li><strong>Model B (Retained Access):</strong> Shared support model. The Joint Venture provides platform updates and critical security patches. Institution handles first-line user support. Escalation pathway available for technical issues.</li>
                  <li><strong>Model C (Full Transfer):</strong> Support available via separate paid agreement. Institution responsible for all maintenance unless support contract is in place.</li>
                </ul>
                <p><strong>All support arrangements include:</strong></p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access to product documentation and knowledge base</li>
                  <li>Notification of critical security vulnerabilities</li>
                  <li>Reasonable response times for critical issues (as defined in License Schedule)</li>
                  <li>Optional training packages for institutional administrators</li>
                </ul>
              </div>
            </section>

            {/* 7.6 Audit Rights */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-primary">7.6 Audit Rights</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  The Joint Venture retains the right to verify compliance with the terms of this Agreement:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Audit Notice:</strong> The Joint Venture may conduct an audit upon thirty (30) days' written notice to the Licensee.</li>
                  <li><strong>Remote Audit:</strong> The Joint Venture may conduct remote technical audits to verify user counts, deployment configurations, and compliance with source code protection clauses.</li>
                  <li><strong>On-Site Audit:</strong> For Model B and Model C deployments, The Joint Venture may conduct on-site audits during normal business hours, not more than once per calendar year.</li>
                  <li><strong>Record Keeping:</strong> The Licensee shall maintain accurate records of users, deployments, and access logs for the duration of the license term plus three (3) years.</li>
                  <li><strong>Cooperation:</strong> The Licensee shall provide reasonable cooperation and access to systems, records, and personnel as necessary to conduct the audit.</li>
                  <li><strong>Remediation:</strong> If an audit reveals non-compliance, the Licensee shall have thirty (30) days to cure the breach. Failure to cure may result in termination and additional fees for unauthorised use.</li>
                  <li><strong>Audit Costs:</strong> Each party shall bear its own costs for audits, unless an audit reveals material non-compliance (greater than 5% deviation from licensed usage), in which case the Licensee shall reimburse reasonable audit costs.</li>
                </ul>
              </div>
            </section>

            {/* 7.7 Data Ownership and Portability */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-primary">7.7 Data Ownership and Portability</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p><strong>Data Ownership:</strong></p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>The Licensee retains full ownership of all institutional data, including student records, teacher content, transcripts, and lesson materials.</li>
                  <li>The Joint Venture owns all rights to the platform, source code, algorithms, and underlying technology.</li>
                  <li>Aggregated, anonymised usage data may be used by The Joint Venture for product improvement and research purposes.</li>
                </ul>
                <p><strong>Data Portability:</strong></p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Upon request or termination, the Licensee may export their data in standard formats (CSV, JSON, or as otherwise agreed).</li>
                  <li>The Joint Venture shall provide reasonable assistance for data export within thirty (30) days of request.</li>
                  <li>Data retention following termination is limited to sixty (60) days, after which data will be securely deleted unless legal requirements dictate otherwise.</li>
                </ul>
              </div>
            </section>

            {/* 7.8 Confidentiality */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-primary">7.8 Confidentiality</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Both parties agree to maintain the confidentiality of proprietary information disclosed during the course of this Agreement:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Confidential Information:</strong> Includes source code, business plans, pricing structures, student data, technical specifications, and any information marked as confidential.</li>
                  <li><strong>Obligations:</strong> Each party shall protect confidential information with the same degree of care used for its own confidential information, but no less than reasonable care.</li>
                  <li><strong>Permitted Disclosures:</strong> Confidential information may be disclosed if required by law, court order, or governmental authority, provided the disclosing party gives reasonable advance notice where legally permitted.</li>
                  <li><strong>Exclusions:</strong> Information that is publicly available, independently developed, or rightfully obtained from third parties is not subject to confidentiality obligations.</li>
                  <li><strong>Survival:</strong> Confidentiality obligations shall survive termination of this Agreement for a period of five (5) years.</li>
                </ul>
              </div>
            </section>

            {/* 7.9 Termination */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-primary">7.9 Termination</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p><strong>Termination for Convenience:</strong></p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Either party may terminate this Agreement with ninety (90) days' written notice.</li>
                  <li>For annual licenses, termination takes effect at the end of the current license term unless otherwise agreed.</li>
                </ul>
                <p><strong>Termination for Cause:</strong></p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Either party may terminate immediately upon material breach by the other party that remains uncured for thirty (30) days after written notice.</li>
                  <li>Material breaches include: violation of source code protection clauses, non-payment, exceeding licensed user limits by more than 10%, or misuse of the Licensed Software.</li>
                </ul>
                <p><strong>Effects of Termination:</strong></p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>All rights granted under this license immediately terminate.</li>
                  <li>The Licensee must immediately cease all use of the Licensed Software.</li>
                  <li>For Model B and C deployments, the Licensee must certify in writing the deletion of all source code within thirty (30) days.</li>
                  <li>The Licensee may export their data within sixty (60) days of termination.</li>
                  <li>Sections relating to Source Code Protection, Confidentiality, Limitation of Liability, and Audit Rights survive termination.</li>
                </ul>
              </div>
            </section>

            {/* 7.10 Warranty Disclaimer */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-primary">7.10 Warranty Disclaimer</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  THE LICENSED SOFTWARE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>IMPLIED WARRANTIES OF MERCHANTABILITY</li>
                  <li>FITNESS FOR A PARTICULAR PURPOSE</li>
                  <li>NON-INFRINGEMENT</li>
                  <li>UNINTERRUPTED OR ERROR-FREE OPERATION</li>
                </ul>
                <p className="text-sm">
                  The Licensee acknowledges that it is solely responsible for ensuring the Licensed Software meets its requirements and complies with applicable local laws and educational regulations. The Joint Venture does not warrant that the Licensed Software will meet specific institutional requirements or integrate with all third-party systems.
                </p>
              </div>
            </section>

            {/* 7.11 Indemnification */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-primary">7.11 Indemnification</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p><strong>Licensee Indemnification:</strong></p>
                <p className="text-sm">
                  The Licensee shall indemnify, defend, and hold harmless The Joint Venture from and against any claims, damages, losses, and expenses arising from:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-sm">
                  <li>The Licensee's breach of this Agreement</li>
                  <li>Misuse of the Licensed Software by the Licensee or its users</li>
                  <li>Content uploaded or created by the Licensee's users</li>
                  <li>Violation of applicable laws or regulations by the Licensee</li>
                </ul>
                <p><strong>Licensor Indemnification:</strong></p>
                <p className="text-sm">
                  The Joint Venture shall indemnify the Licensee against third-party claims alleging that the Licensed Software infringes any intellectual property rights, provided the Licensee promptly notifies The Joint Venture and allows The Joint Venture to control the defence.
                </p>
              </div>
            </section>

            {/* Licensing Contact */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-6 mt-8">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="h-6 w-6 text-primary" />
                <h4 className="font-semibold text-foreground">Institutional Licensing Enquiries</h4>
              </div>
              <p className="text-muted-foreground text-sm">
                For licensing enquiries, custom deployment discussions, or to request a License Schedule, please contact:
              </p>
              <p className="font-medium text-primary mt-2">
                licensing@tandemlearn.app
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Please include your institution name, estimated number of users, and preferred deployment model in your enquiry.
              </p>
            </div>

            <Separator className="my-10" />

            {/* Continuing with general terms - Sections 8-13 */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">8. Service Availability</h2>
              <p className="text-muted-foreground leading-relaxed">
                We strive to maintain high availability but do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control. We will endeavour to provide advance notice of planned maintenance where possible.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                To the maximum extent permitted by law, the Service providers shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability shall not exceed the fees paid by you in the twelve months preceding the claim.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">10. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may suspend or terminate your access to the Service at any time for violation of these terms or for any other reason at our discretion. Upon termination, you must cease all use of the Service. Provisions that by their nature should survive termination shall remain in effect.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">11. Modifications to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these terms at any time. Material changes will be communicated via email or through the Service. Continued use after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">12. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These terms shall be governed by and construed in accordance with the laws of the jurisdiction in which the Service provider operates, without regard to conflict of law principles. Any disputes shall be resolved through good faith negotiation or, failing that, through binding arbitration.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">13. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these Terms of Service, please contact us at:<br />
                <span className="font-medium">[Contact email to be provided]</span>
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
          <Link to="/privacy" className="hover:text-primary hover:underline">Privacy Policy</Link>
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

export default Terms;
