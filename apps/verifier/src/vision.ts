import Anthropic from "@anthropic-ai/sdk";

const VISION_PROMPT = `You are a waste collection verification agent for EcoBuild, an environmental rewards platform.

Analyze this image and determine if it shows collected waste/recyclable materials.

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "waste_detected": boolean,
  "waste_type": "plastic" | "glass" | "metal" | "paper" | "organic" | "mixed",
  "estimated_weight_lbs": number,
  "confidence": number between 0 and 1,
  "description": "brief description of what you see"
}

Rules:
- waste_detected: true only if you can clearly see collected waste/recyclables
- waste_type: the dominant material type. Use "mixed" if multiple types are visible
- estimated_weight_lbs: rough estimate of total weight in pounds (minimum 1 if waste detected)
- confidence: how confident you are in the classification (0.0 to 1.0)
- description: one sentence describing what's in the image

If the image does not show waste or recyclables (e.g., it's a selfie, landscape, food, etc.), set waste_detected to false and confidence to your certainty level.

Be conservative — only confirm waste_detected if you're reasonably certain.`;

export type VisionResult = {
  waste_detected: boolean;
  waste_type: string;
  estimated_weight_lbs: number;
  confidence: number;
  description: string;
};

let client: Anthropic | null = null;

export function initVision() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn(
      "[vision] ANTHROPIC_API_KEY not set — using mock classification"
    );
    return;
  }
  client = new Anthropic({ apiKey });
  console.log("[vision] Anthropic Claude API initialized");
}

export async function classifyImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<VisionResult> {
  // If no API key, return mock result for testing
  if (!client) {
    console.log("[vision] Using mock classification (no API key)");
    return {
      waste_detected: true,
      waste_type: "plastic",
      estimated_weight_lbs: 5,
      confidence: 0.85,
      description:
        "Mock classification: appears to be collected plastic waste materials",
    };
  }

  const mediaType = normalizeMediaType(mimeType);
  const base64 = imageBuffer.toString("base64");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: "text",
            text: VISION_PROMPT,
          },
        ],
      },
    ],
  });

  // Extract text content
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const rawText = textBlock.text.trim();

  // Parse JSON (handle potential markdown wrapping)
  let jsonText = rawText;
  const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonText = fenceMatch[1].trim();
  }

  const result: VisionResult = JSON.parse(jsonText);

  // Validate & clamp values
  result.confidence = Math.max(0, Math.min(1, result.confidence));
  result.estimated_weight_lbs = Math.max(0, result.estimated_weight_lbs);
  if (!result.waste_type) result.waste_type = "mixed";

  return result;
}

function normalizeMediaType(
  mime: string
): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  const lower = mime.toLowerCase();
  if (lower.includes("png")) return "image/png";
  if (lower.includes("gif")) return "image/gif";
  if (lower.includes("webp")) return "image/webp";
  return "image/jpeg";
}
