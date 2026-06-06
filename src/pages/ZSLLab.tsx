import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hand, BookOpen, Globe2, School, ArrowRight, ExternalLink, Mail, ArrowLeftRight } from "lucide-react";
import Footer from "@/components/Footer";
import { ZSL_PHRASES } from "@/utils/zslPhrases";
import { WIPStatusPanel } from "@/components/WIPStatusPanel";

const PILOT_SCHOOLS = 4; // editable as pilots grow
const CAPTION_LANGUAGES = 3; // English / Shona / Ndebele

export default function ZSLLab() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← TandemLearn</Link>
          <Badge variant="outline" className="text-xs">Public • Built openly</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-5xl space-y-12">
        {/* Hero */}
        <section className="text-center space-y-4">
          <Badge className="mb-2">ZSL Lab</Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-tight">
            An African sign-language layer<br />for African classrooms.
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Most sign-language tech ships ASL. We are building a Zimbabwean Sign Language–first
            inclusion layer — openly, with the deaf community, with no foreign licence in the loop.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Button asChild size="lg"><Link to="/student/fingerspell">Try the practice tool <ArrowRight className="h-4 w-4 ml-2" /></Link></Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/dialect-bridge"><ArrowLeftRight className="h-4 w-4 mr-2" /> Dialect Bridge (WIP)</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="mailto:hello@tandemlearn.app?subject=Contribute%20a%20sign&body=I%27d%20like%20to%20contribute%20signs%2Fclips%20to%20the%20ZSL%20Lab.">
                <Mail className="h-4 w-4 mr-2" /> Contribute a sign
              </a>
            </Button>
          </div>
        </section>

        {/* Counters */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Counter icon={<Hand className="h-5 w-5" />} value="26" label="Letters covered" />
          <Counter icon={<BookOpen className="h-5 w-5" />} value={String(ZSL_PHRASES.length)} label="Phrases in v0" />
          <Counter icon={<Globe2 className="h-5 w-5" />} value={String(CAPTION_LANGUAGES)} label="Caption languages" />
          <Counter icon={<School className="h-5 w-5" />} value={String(PILOT_SCHOOLS)} label="Pilot schools" />
        </section>

        {/* Why */}
        <section className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Why ZSL-first</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Zimbabwean Sign Language is constitutionally recognised but invisible in mainstream edtech. Google Classroom, Teams, Zoom — none of them carry a single ZSL sign.</p>
              <p>Until the speech-to-avatar problem is solved by someone with $10M, deaf and hard-of-hearing learners need a working alternative <em>today</em>. Static clips, fingerspell and tri-lingual captions are that alternative.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>How it's built</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Static PNGs for letters, looping MP4 clips for phrases, browser speech-recognition for the speech-to-fingerspell demo. No external API, no per-seat licence, works offline.</p>
              <p>Each phrase file is replaceable in place — when better community footage arrives, we drop it in without touching code.</p>
            </CardContent>
          </Card>
        </section>

        {/* WIP Status — grant-ready */}
        <WIPStatusPanel />

        {/* Credits */}
        <section className="text-sm text-muted-foreground border-t pt-6">
          <p className="font-semibold text-foreground mb-2">Inspired by, learning from</p>
          <ul className="space-y-1">
            <li className="flex items-center gap-2"><ExternalLink className="h-3 w-3" /> Deaf Zimbabwe Trust — ZSL community leadership</li>
            <li className="flex items-center gap-2"><ExternalLink className="h-3 w-3" /> Wits Centre for Deaf Studies — SASL dictionary</li>
            <li className="flex items-center gap-2"><ExternalLink className="h-3 w-3" /> Kenya National Association of the Deaf — KSL Online</li>
            <li className="flex items-center gap-2"><ExternalLink className="h-3 w-3" /> Signvrse (Nairobi) — kindred African effort</li>
          </ul>
          <p className="mt-4 text-xs italic">
            ZSL Lab is explicitly not ASL. We credit and follow African deaf-led organisations,
            and welcome partnerships with ministries, donors and Schools for the Deaf.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

const Counter = ({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) => (
  <div className="rounded-xl border-2 border-border bg-card p-4 text-center">
    <div className="flex justify-center text-primary mb-1">{icon}</div>
    <div className="text-3xl font-extrabold text-foreground">{value}</div>
    <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
  </div>
);
