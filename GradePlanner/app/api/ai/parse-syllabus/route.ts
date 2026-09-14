import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import pdf from "pdf-parse";

const SyllabusSchema = z.object({
  categories: z.array(
    z.object({
      name: z.string(),
      // Percent of the final grade; null when the syllabus doesn't state one
      weight: z.number().nullable(),
      count: z.number(),
    })
  ),
});

const buildPrompt = (syllabusText: string) => `Extract the grading categories from this course syllabus.

For each category give:
- name: the category as the syllabus names it (Exams, Homework, Quizzes, Projects, Participation, ...)
- weight: its percentage of the final grade (0-100), or null if the syllabus doesn't state one
- count: how many graded items it contains, or 1 if the syllabus doesn't say

Combine items that share a weight into one category. For example, "Midterm 1 and Midterm 2: 15% each" becomes Exams with weight 30 and count 2.

<syllabus>
${syllabusText}
</syllabus>`;

// POST /api/ai/parse-syllabus
// Parses PDF syllabus using Claude API
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "PDF file is required" },
        { status: 400 }
      );
    }

    // Extract text from PDF
    let pdfText: string;
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      pdfText = (await pdf(buffer)).text;
    } catch {
      return NextResponse.json(
        { error: "Failed to read PDF file. Please ensure it's a valid PDF." },
        { status: 400 }
      );
    }

    if (!pdfText || pdfText.trim().length === 0) {
      return NextResponse.json(
        { error: "PDF appears to be empty or unreadable" },
        { status: 400 }
      );
    }

    if (!process.env.CLAUDE_API_KEY) {
      console.error("CLAUDE_API_KEY is not set");
      return NextResponse.json(
        { error: "AI service not configured. Please set CLAUDE_API_KEY." },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

    const message = await anthropic.beta.messages.parse({
      model: "claude-opus-5",
      max_tokens: 16000,
      // If a safety classifier declines, re-run on Anthropic's recommended
      // fallback model instead of failing the upload
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { format: zodOutputFormat(SyllabusSchema) },
      messages: [{ role: "user", content: buildPrompt(pdfText) }],
    });

    if (message.stop_reason === "refusal") {
      return NextResponse.json(
        {
          error:
            "AI refused to process this syllabus. Please try a different file or enter manually.",
        },
        { status: 422 }
      );
    }

    if (message.stop_reason === "model_context_window_exceeded") {
      return NextResponse.json(
        {
          error:
            "PDF is too large. Please try a shorter syllabus or enter manually.",
        },
        { status: 413 }
      );
    }

    const syllabusData = message.parsed_output;
    if (!syllabusData) {
      return NextResponse.json(
        {
          error:
            "AI could not parse syllabus format. Please try a different file or enter manually.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: syllabusData,
      rawText: pdfText.substring(0, 500), // First 500 chars for reference
    });
  } catch (error) {
    console.error("Syllabus parsing error:", error);

    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "AI API key is invalid or missing" },
        { status: 500 }
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "AI service is busy. Please try again in a minute." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to parse syllabus",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
