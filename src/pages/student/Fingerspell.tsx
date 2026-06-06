import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Hand, BookOpen, Mic, Layers } from "lucide-react";
import { FingerspellDisplay } from "@/components/FingerspellDisplay";
import { ZSLPhraseLibrary } from "@/components/ZSLPhraseLibrary";
import { WordCombinationBuilder } from "@/components/WordCombinationBuilder";
import Footer from "@/components/Footer";

export default function Fingerspell() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/student/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Hand className="h-6 w-6 text-primary" />
              ZSL Practice
            </h1>
            <p className="text-sm text-muted-foreground">
              Fingerspell letters, learn common signs, or speak a word
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <Tabs defaultValue="letters">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="letters" className="flex-col sm:flex-row py-2"><Hand className="h-4 w-4 sm:mr-2" /> <span className="text-xs sm:text-sm">Letters</span></TabsTrigger>
            <TabsTrigger value="builder" className="flex-col sm:flex-row py-2"><Layers className="h-4 w-4 sm:mr-2" /> <span className="text-xs sm:text-sm">Builder</span></TabsTrigger>
            <TabsTrigger value="phrases" className="flex-col sm:flex-row py-2"><BookOpen className="h-4 w-4 sm:mr-2" /> <span className="text-xs sm:text-sm">Phrases</span></TabsTrigger>
            <TabsTrigger value="quick" className="flex-col sm:flex-row py-2"><Mic className="h-4 w-4 sm:mr-2" /> <span className="text-xs sm:text-sm">A–Z</span></TabsTrigger>
          </TabsList>

          <TabsContent value="letters" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">Letter & Word Lookup</CardTitle>
                <CardDescription className="text-base">
                  Type or speak a word, then press Auto-play to fingerspell it in sequence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FingerspellDisplay />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="builder" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">Word Combination Builder</CardTitle>
                <CardDescription className="text-base">
                  Queue several words, tune the pacing, then play the whole sentence as a fingerspelled sequence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WordCombinationBuilder />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="phrases" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">Common ZSL Phrases</CardTitle>
                <CardDescription className="text-base">
                  Twenty everyday signs with English, Shona, and Ndebele captions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ZSLPhraseLibrary />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quick" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Reference — Full Alphabet</CardTitle>
              </CardHeader>
              <CardContent>
                <FingerspellDisplay word="abcdefghijklmnopqrstuvwxyz" hideInput compact />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
