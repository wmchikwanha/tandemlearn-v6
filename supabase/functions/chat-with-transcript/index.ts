import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import mammoth from "https://esm.sh/mammoth@1.6.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to detect text-based file types
const isTextFile = (fileType: string, fileName: string): boolean => {
  const textMimeTypes = ['text/plain', 'text/markdown', 'text/csv'];
  const textExtensions = ['.txt', '.md', '.markdown', '.csv'];
  
  if (textMimeTypes.includes(fileType)) return true;
  return textExtensions.some(ext => fileName?.toLowerCase().endsWith(ext));
};

// Helper to detect DOCX files
const isDocxFile = (fileType: string, fileName: string): boolean => {
  return fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
         fileName?.toLowerCase().endsWith('.docx');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, question, conversationHistory, fileUrl, fileType, fileName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('=== Chat with Transcript Request ===');
    console.log('Question:', question);
    console.log('File URL:', fileUrl);
    console.log('File Type:', fileType);
    console.log('File Name:', fileName);
    console.log('Has transcript:', !!transcript);
    console.log('Conversation history length:', conversationHistory?.length || 0);

    let extractedText = '';
    let extractionError = '';
    let extractionSource = '';
    let isPdf = false;

    // Extract content based on file type
    if (fileUrl) {
      // PDF - use Gemini's native PDF understanding (don't extract text ourselves)
      if (fileType === 'application/pdf') {
        extractionSource = 'PDF';
        isPdf = true;
        console.log('PDF detected - will use Gemini native PDF understanding');
      }
      // DOCX extraction
      else if (isDocxFile(fileType, fileName)) {
        extractionSource = 'DOCX';
        try {
          console.log('Attempting to fetch DOCX from:', fileUrl);
          const docxResponse = await fetch(fileUrl);
          console.log('DOCX fetch status:', docxResponse.status);
          
          if (!docxResponse.ok) {
            extractionError = `Failed to fetch DOCX: HTTP ${docxResponse.status}`;
            console.error(extractionError);
          } else {
            const docxBuffer = await docxResponse.arrayBuffer();
            console.log('DOCX buffer size:', docxBuffer.byteLength, 'bytes');
            
            const result = await mammoth.extractRawText({ arrayBuffer: docxBuffer });
            extractedText = result.value;
            console.log(`Successfully extracted ${extractedText.length} characters from DOCX`);
            
            if (result.messages && result.messages.length > 0) {
              console.log('Mammoth warnings:', result.messages);
            }
            
            if (extractedText.length < 10) {
              extractionError = 'The Word document appears to be empty or contains no readable text.';
            }
          }
        } catch (error) {
          extractionError = `Error extracting DOCX text: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error('DOCX extraction error:', error);
        }
      }
      // Plain text file extraction
      else if (isTextFile(fileType, fileName)) {
        extractionSource = 'Text';
        try {
          console.log('Attempting to fetch text file from:', fileUrl);
          const textResponse = await fetch(fileUrl);
          console.log('Text file fetch status:', textResponse.status);
          
          if (!textResponse.ok) {
            extractionError = `Failed to fetch text file: HTTP ${textResponse.status}`;
            console.error(extractionError);
          } else {
            extractedText = await textResponse.text();
            console.log(`Successfully read ${extractedText.length} characters from text file`);
          }
        } catch (error) {
          extractionError = `Error reading text file: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error('Text file read error:', error);
        }
      }
    }

    // Build system message based on content type
    let systemContent = '';
    
    if (fileUrl) {
      const hasExtractedContent = extractedText && extractedText.length > 10;
      
      if (isPdf) {
        // PDF - will be sent as multimodal, Gemini parses it directly
        systemContent = `You are an educational AI assistant helping students understand lesson materials. A PDF document named "${fileName}" has been shared with you. Read and analyze the PDF content directly, then answer questions clearly, explain concepts in multiple ways if needed, and help students learn at their own pace.

Your role:
- Answer questions about the content in this PDF document
- Explain concepts in simpler terms when asked
- Generate practice questions or summaries based on the content
- Help students understand difficult topics
- Be encouraging and supportive`;
      } else if (hasExtractedContent) {
        // Successfully extracted content from document
        systemContent = `You are an educational AI assistant helping students understand lesson materials. The document "${fileName}" has been provided below. Answer questions clearly, explain concepts in multiple ways if needed, and help students learn at their own pace.

DOCUMENT CONTENT (extracted from ${extractionSource}):
${extractedText}

Your role:
- Answer questions about the content in this document
- Explain concepts in simpler terms when asked
- Generate practice questions or summaries based on the content
- Help students understand difficult topics
- Be encouraging and supportive`;
      } else if (fileType?.startsWith('image/')) {
        // Image file - use multimodal
        systemContent = `You are an educational AI assistant helping students understand lesson materials. An image file named "${fileName}" has been shared. Analyze the image and answer questions about it clearly, explain concepts in multiple ways if needed, and help students learn at their own pace.

Your role:
- Answer questions about what you see in the image
- Explain concepts in simpler terms when asked
- Help students understand difficult topics
- Be encouraging and supportive`;
      } else {
        // Extraction failed or unsupported file type
        const reason = extractionError || `This file type (${fileType}) is not currently supported for content extraction`;
        systemContent = `You are an educational AI assistant. The student is trying to ask about a file named "${fileName}", but I was unable to extract the text content from it.

Reason: ${reason}

Please let the student know that:
1. You cannot access the content of this file
2. They should try downloading and opening the file directly on their device
3. If they have specific questions, they can copy/paste the relevant text and you can help with that

Be helpful, apologetic, and suggest alternatives.`;
      }
    } else {
      // Transcript mode
      systemContent = `You are an educational AI assistant helping students understand their classroom lesson. The lesson transcript is provided below. Answer questions clearly, explain concepts in multiple ways if needed, and help students learn at their own pace.

LESSON TRANSCRIPT:
${transcript}

Your role:
- Answer questions about the lesson content
- Explain concepts in simpler terms when asked
- Generate practice questions or summaries
- Help students understand difficult topics
- Be encouraging and supportive`;
    }

    // Build user message with multimodal support for images and PDFs
    let userMessage: any;

    if (fileUrl && (fileType?.startsWith('image/') || isPdf)) {
      // For images: pass URL directly.
      // For PDFs: fetch and send as a data URL so the AI gateway can accept the MIME type.
      let multimodalUrl = fileUrl;

      if (isPdf) {
        try {
          console.log('Fetching PDF for data URL encoding:', fileUrl);
          const pdfResponse = await fetch(fileUrl);
          console.log('PDF fetch status:', pdfResponse.status);

          if (!pdfResponse.ok) {
            throw new Error(`Failed to fetch PDF: HTTP ${pdfResponse.status}`);
          }

          const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());
          console.log('PDF size:', pdfBytes.length, 'bytes');
          
          // Chunked base64 encoding to avoid call stack overflow on large PDFs
          let binary = '';
          const chunkSize = 32768; // Process 32KB at a time
          for (let i = 0; i < pdfBytes.length; i += chunkSize) {
            const chunk = pdfBytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, Array.from(chunk));
          }
          const base64 = btoa(binary);
          
          multimodalUrl = `data:application/pdf;base64,${base64}`;
          console.log('PDF encoded as data URL (base64 length):', base64.length);
        } catch (e) {
          console.error('Failed to encode PDF as data URL:', e);
          // Fall back to non-multimodal prompt (will trigger friendly "can’t read" response)
          isPdf = false;
        }
      }

      if (fileType?.startsWith('image/') || isPdf) {
        userMessage = {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: multimodalUrl } },
            { type: "text", text: question }
          ]
        };
        console.log('Using multimodal message with file content');
      } else {
        userMessage = { role: "user", content: question };
      }
    } else {
      userMessage = {
        role: "user",
        content: question
      };
    }

    // Build messages array with full context
    const messages = [
      { role: "system", content: systemContent },
      ...(conversationHistory || []),
      userMessage
    ];

    console.log('Calling Lovable AI...');
    console.log('System prompt length:', systemContent.length);
    console.log('Extracted content length:', extractedText.length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    console.log('AI response generated successfully');
    console.log('Response length:', aiResponse.length);

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error in chat-with-transcript:', error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
