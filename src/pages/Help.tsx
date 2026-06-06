import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, BookOpen, Video, Wrench, ExternalLink, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AboutDialog } from "@/components/AboutDialog";

const Help = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <AboutDialog />
      
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Help Center
              </h1>
              <p className="text-muted-foreground mt-1">
                Find answers, tutorials, and troubleshooting guides
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Tabs defaultValue="faq" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="faq" className="gap-2">
              <BookOpen className="h-4 w-4" />
              FAQs
            </TabsTrigger>
            <TabsTrigger value="tutorials" className="gap-2">
              <Video className="h-4 w-4" />
              Tutorials
            </TabsTrigger>
            <TabsTrigger value="troubleshooting" className="gap-2">
              <Wrench className="h-4 w-4" />
              Troubleshooting
            </TabsTrigger>
          </TabsList>

          {/* FAQs Tab */}
          <TabsContent value="faq" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>
                  Quick answers to common questions about TandemLearn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>What is TandemLearn?</AccordionTrigger>
                    <AccordionContent>
                      TandemLearn is a real-time classroom transcription platform designed for inclusive education. 
                      It provides live speech-to-text transcription, enabling teachers to broadcast their voice as text 
                      while students receive, participate, and save lessons in real-time. Perfect for deaf, hard-of-hearing, 
                      and all students who benefit from visual learning aids.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>How do I start a live session as a teacher?</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                        <li>Navigate to your Teacher Dashboard</li>
                        <li>Click the "Start Broadcasting" button</li>
                        <li>Allow microphone access when prompted</li>
                        <li>Your session name will be displayed - share it with students</li>
                        <li>Start speaking - transcription happens automatically!</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger>How do students join a session?</AccordionTrigger>
                    <AccordionContent>
                      Students can join in two ways:
                      <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground ml-4">
                        <li><strong>From assigned lessons:</strong> Check your timetable and click on scheduled lessons</li>
                        <li><strong>Direct join:</strong> Enter the session name provided by your teacher on the student dashboard</li>
                      </ul>
                      Once joined, you'll see live transcription and can participate using the raise hand feature.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4">
                    <AccordionTrigger>Can I save transcripts for later review?</AccordionTrigger>
                    <AccordionContent>
                      Yes! Both teachers and students can save transcripts. During or after a session, click the 
                      "Save Transcript" button. Give it a title, and it will be stored in your "My Transcripts" 
                      section. You can view, search, and download saved transcripts anytime.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-5">
                    <AccordionTrigger>What languages are supported?</AccordionTrigger>
                    <AccordionContent>
                      TandemLearn supports multiple languages for transcription including English, Spanish, French, 
                      German, Mandarin, and more. You can select your preferred language when creating a lesson or 
                      starting a session. The system will transcribe in the selected language.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-6">
                    <AccordionTrigger>How does the sign language feature work?</AccordionTrigger>
                    <AccordionContent>
                      The sign language panel provides visual communication support. It detects common educational 
                      terms in the transcription and displays corresponding sign language icons. This helps deaf 
                      students follow along with additional visual cues. The feature works automatically alongside 
                      live transcription.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-7">
                    <AccordionTrigger>How do I create and manage lessons?</AccordionTrigger>
                    <AccordionContent>
                      Teachers can create lessons from the Teacher Dashboard:
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground mt-2">
                        <li>Click "Manage Lessons"</li>
                        <li>Click "Create New Lesson"</li>
                        <li>Fill in lesson details (title, description, schedule)</li>
                        <li>Assign students using the assignment dialog</li>
                        <li>Upload materials (PDFs, documents, images)</li>
                      </ol>
                      Students will see assigned lessons in their timetable.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-bulk-1">
                    <AccordionTrigger>How do I add multiple students at once?</AccordionTrigger>
                    <AccordionContent>
                      Use the Bulk Add feature to register many students quickly:
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground mt-2">
                        <li>Go to Teacher Dashboard → Manage Lessons → My Students tab</li>
                        <li>Click "Invite Students" and select the "Bulk Add" tab</li>
                        <li>Paste data from Excel or upload a CSV file with Name and School ID columns</li>
                        <li>Preview the students and click "Create Accounts"</li>
                        <li>Download the credential sheet (CSV or printable cards)</li>
                        <li>Distribute credentials to students or parents</li>
                      </ol>
                      <p className="mt-2 text-muted-foreground">
                        <strong>Important:</strong> Save the credential sheet immediately - passwords cannot be retrieved later!
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-bulk-2">
                    <AccordionTrigger>What are school-generated student credentials?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground mb-2">
                        When bulk-adding students, the system generates unique login credentials:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                        <li><strong>Username:</strong> Based on the School ID you provide (e.g., stu001@tandemlearn.school)</li>
                        <li><strong>Password:</strong> A memorable auto-generated password (e.g., happy-tiger-42)</li>
                      </ul>
                      <p className="mt-2 text-muted-foreground">
                        Students use these credentials to log in. This is ideal for young students (Grade 1+) or 
                        institutional settings where students may not have email addresses.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-bulk-3">
                    <AccordionTrigger>How do I distribute login credentials to students/parents?</AccordionTrigger>
                    <AccordionContent>
                      After bulk-creating accounts, you can:
                      <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-2 ml-4">
                        <li><strong>Download CSV:</strong> Get a spreadsheet with all credentials for your records</li>
                        <li><strong>Print Cards:</strong> Generate printable credential cards to cut and distribute</li>
                        <li><strong>Copy All:</strong> Copy credentials as text to paste into emails or messages</li>
                      </ul>
                      <p className="mt-2 text-muted-foreground">
                        For young students, send printed cards home with parents. Each card shows the student's name, 
                        username, password, and the login URL.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-8">
                    <AccordionTrigger>What file types can I upload as lesson materials?</AccordionTrigger>
                    <AccordionContent>
                      You can upload various file types including:
                      <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground ml-4">
                        <li>Documents: PDF, DOC, DOCX, TXT</li>
                        <li>Presentations: PPT, PPTX</li>
                        <li>Spreadsheets: XLS, XLSX</li>
                        <li>Images: JPG, PNG, GIF</li>
                      </ul>
                      Maximum file size is 10MB per file.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-9">
                    <AccordionTrigger>Is TandemLearn accessible on mobile devices?</AccordionTrigger>
                    <AccordionContent>
                      Yes! TandemLearn is fully responsive and works on smartphones and tablets. However, for the 
                      best teacher experience (especially for starting broadcasts), we recommend using a desktop or 
                      laptop computer. Students can comfortably view and participate from any device.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-10">
                    <AccordionTrigger>How accurate is the transcription?</AccordionTrigger>
                    <AccordionContent>
                      Transcription accuracy typically ranges from 85-95%, depending on audio quality, speaking clarity, 
                      and background noise. For best results:
                      <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground ml-4">
                        <li>Use a good quality microphone</li>
                        <li>Speak clearly at a moderate pace</li>
                        <li>Minimize background noise</li>
                        <li>Ensure stable internet connection</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tutorials Tab */}
          <TabsContent value="tutorials" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Teacher Tutorials */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5 text-primary" />
                    Getting Started as a Teacher
                  </CardTitle>
                  <CardDescription>
                    Learn how to set up and run your first live transcription session
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    This tutorial covers:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Creating your teacher account</li>
                    <li>• Starting a live broadcast</li>
                    <li>• Managing microphone permissions</li>
                    <li>• Sharing session details with students</li>
                  </ul>
                  <Button className="w-full mt-4" variant="outline">
                    <Video className="h-4 w-4 mr-2" />
                    Watch Tutorial (Coming Soon)
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-secondary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5 text-secondary" />
                    Getting Started as a Student
                  </CardTitle>
                  <CardDescription>
                    Learn how to join sessions and make the most of TandemLearn
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    This tutorial covers:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Creating your student account</li>
                    <li>• Joining live sessions</li>
                    <li>• Using the raise hand feature</li>
                    <li>• Saving and reviewing transcripts</li>
                  </ul>
                  <Button className="w-full mt-4" variant="outline">
                    <Video className="h-4 w-4 mr-2" />
                    Watch Tutorial (Coming Soon)
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-accent/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5 text-accent" />
                    Creating & Managing Lessons
                  </CardTitle>
                  <CardDescription>
                    Master lesson creation, scheduling, and student assignments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    This tutorial covers:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Creating recurring lessons</li>
                    <li>• Assigning students to lessons</li>
                    <li>• Uploading lesson materials</li>
                    <li>• Managing your weekly schedule</li>
                  </ul>
                  <Button className="w-full mt-4" variant="outline">
                    <Video className="h-4 w-4 mr-2" />
                    Watch Tutorial (Coming Soon)
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5 text-primary" />
                    Understanding Sign Language Support
                  </CardTitle>
                  <CardDescription>
                    Learn how the sign language panel enhances accessibility
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    This tutorial covers:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• How automatic detection works</li>
                    <li>• Understanding sign icons</li>
                    <li>• Customizing sign preferences</li>
                    <li>• Best practices for deaf education</li>
                  </ul>
                  <Button className="w-full mt-4" variant="outline">
                    <Video className="h-4 w-4 mr-2" />
                    Watch Tutorial (Coming Soon)
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-secondary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5 text-secondary" />
                    Bulk Adding Students
                  </CardTitle>
                  <CardDescription>
                    Add entire classes of students with auto-generated credentials
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    This tutorial covers:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Preparing your student list (CSV or paste)</li>
                    <li>• Understanding auto-generated credentials</li>
                    <li>• Downloading and printing credential cards</li>
                    <li>• Distributing login info to parents/guardians</li>
                  </ul>
                  <Button className="w-full mt-4" variant="outline">
                    <Video className="h-4 w-4 mr-2" />
                    Watch Tutorial (Coming Soon)
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Additional Resources */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Resources</CardTitle>
                <CardDescription>
                  Helpful links and documentation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-between">
                  Best Practices for Live Transcription
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="w-full justify-between">
                  Accessibility Guidelines
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="w-full justify-between">
                  Technical Requirements & Setup
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Troubleshooting Tab */}
          <TabsContent value="troubleshooting" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Common Issues & Solutions</CardTitle>
                <CardDescription>
                  Quick fixes for frequently encountered problems
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="audio-1">
                    <AccordionTrigger className="text-left">
                      Microphone not working or not detected
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground font-semibold">Solution:</p>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                        <li>Check browser permissions - click the lock icon in the address bar and ensure microphone access is allowed</li>
                        <li>Verify your microphone is properly connected and selected in your system settings</li>
                        <li>Refresh the page and allow microphone access when prompted</li>
                        <li>Try a different browser (Chrome and Edge work best)</li>
                        <li>Restart your computer if the issue persists</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="audio-2">
                    <AccordionTrigger className="text-left">
                      Transcription is very inaccurate or garbled
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground font-semibold">Solution:</p>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                        <li>Check your internet connection speed (minimum 5 Mbps recommended)</li>
                        <li>Move closer to your microphone or use a headset microphone</li>
                        <li>Reduce background noise - close windows, turn off fans</li>
                        <li>Speak more slowly and clearly, especially with technical terms</li>
                        <li>Verify the correct language is selected for your session</li>
                        <li>Consider using a higher-quality external microphone</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="connect-1">
                    <AccordionTrigger className="text-left">
                      Unable to join a session as a student
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground font-semibold">Solution:</p>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                        <li>Verify you've entered the correct session name (case-sensitive)</li>
                        <li>Confirm the teacher has started broadcasting</li>
                        <li>Refresh your browser and try again</li>
                        <li>Check that you're logged in with your student account</li>
                        <li>Clear your browser cache and cookies, then try again</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="sync-1">
                    <AccordionTrigger className="text-left">
                      Transcription is delayed or laggy
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground font-semibold">Solution:</p>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                        <li>Test your internet speed - both upload (teacher) and download (student) should be stable</li>
                        <li>Close unnecessary browser tabs and applications</li>
                        <li>Try switching to a wired ethernet connection instead of Wi-Fi</li>
                        <li>Move closer to your Wi-Fi router if using wireless</li>
                        <li>Restart your browser to clear memory</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="save-1">
                    <AccordionTrigger className="text-left">
                      Unable to save or download transcripts
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground font-semibold">Solution:</p>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                        <li>Make sure you're logged in (transcripts require an account)</li>
                        <li>Check your browser's download settings and permissions</li>
                        <li>Disable any browser extensions that might block downloads</li>
                        <li>Try a different browser if the problem continues</li>
                        <li>Ensure you have sufficient storage space on your device</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="assign-1">
                    <AccordionTrigger className="text-left">
                      Students not receiving lesson assignments
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground font-semibold">Solution:</p>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                        <li>Verify students are added to the assignment list</li>
                        <li>Confirm the lesson is marked as "Active"</li>
                        <li>Check that the schedule dates are correct</li>
                        <li>Ask students to refresh their timetable page</li>
                        <li>Ensure students are logged in with the correct account</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="mobile-1">
                    <AccordionTrigger className="text-left">
                      Features not working properly on mobile
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground font-semibold">Solution:</p>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                        <li>Update your mobile browser to the latest version</li>
                        <li>For broadcasting (teachers), use a desktop computer instead - mobile broadcasting is limited</li>
                        <li>For students, most features work well on mobile - ensure you allow browser permissions</li>
                        <li>Try rotating to landscape mode for better layout on smaller screens</li>
                        <li>Close other apps to free up device memory</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="login-1">
                    <AccordionTrigger className="text-left">
                      Login or authentication issues
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground font-semibold">Solution:</p>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                        <li>Verify you're using the correct email address</li>
                        <li>Use the "Forgot Password" link if you can't remember your password</li>
                        <li>Clear cookies and cache, then try logging in again</li>
                        <li>Disable browser extensions temporarily</li>
                        <li>Try logging in from an incognito/private browser window</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="files-1">
                    <AccordionTrigger className="text-left">
                      File upload not working for lesson materials
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground font-semibold">Solution:</p>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                        <li>Check file size - maximum is 10MB per file</li>
                        <li>Verify file type is supported (PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, JPG, PNG)</li>
                        <li>Ensure stable internet connection during upload</li>
                        <li>Try compressing large files before uploading</li>
                        <li>Disable VPN temporarily if enabled</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="general-1">
                    <AccordionTrigger className="text-left">
                      Page won't load or shows errors
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-muted-foreground font-semibold">Solution:</p>
                      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                        <li>Refresh the page (Ctrl+R or Cmd+R)</li>
                        <li>Clear browser cache and cookies</li>
                        <li>Try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)</li>
                        <li>Update your browser to the latest version</li>
                        <li>Try accessing from a different browser</li>
                        <li>Check if your firewall or antivirus is blocking the site</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Still Need Help */}
            <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardHeader>
                <CardTitle>Still Need Help?</CardTitle>
                <CardDescription>
                  Can't find a solution to your problem?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  If you're still experiencing issues after trying these solutions, we're here to help:
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <Button variant="outline" className="justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Submit Bug Report
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Community Forum
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    System Status
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  When reporting an issue, please include: browser type/version, operating system, 
                  and steps to reproduce the problem.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Help;
