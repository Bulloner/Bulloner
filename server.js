import express from "express";
import rateLimit from "express-rate-limit";

const app = express();

app.use(express.json({ limit: "20kb" }));

app.use("/api/", rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
}));

const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-5.5";

app.get("/", (req, res) => {
  res.json({
    app: "Universal Transformation AI",
    developer: "Ruang Belajar",
    status: "online"
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/generate", async (req, res) => {
  try {
    const {
      startObject,
      finalObject,
      duration,
      visualStyle,
      extraDetails
    } = req.body || {};

    if (
      typeof startObject !== "string" ||
      typeof finalObject !== "string" ||
      !startObject.trim() ||
      !finalObject.trim()
    ) {
      return res.status(400).json({
        error: "Objek awal dan bentuk akhir wajib diisi."
      });
    }

    if (
      startObject.length > 300 ||
      finalObject.length > 300
    ) {
      return res.status(400).json({
        error: "Deskripsi objek maksimal 300 karakter."
      });
    }

    const seconds = Number(duration);

    if (![5, 6, 8, 10, 15, 20, 30].includes(seconds)) {
      return res.status(400).json({
        error: "Durasi video tidak valid."
      });
    }

    if (!API_KEY) {
      return res.status(500).json({
        error: "API key belum dikonfigurasi di server."
      });
    }

    const instructions = `
You are Universal Transformation AI,
a professional cinematic transformation prompt engineer.

Create ONE complete, highly detailed English video prompt
in a single paragraph, ready to copy into an AI video generator.

USER'S TRANSFORMATION:
Starting object: ${startObject}
Final form: ${finalObject}

Never change the user's starting object or final form.

MANDATORY OPENING SEQUENCE:
A realistic adult male hand enters the frame holding
the starting object. The hand presses a clearly visible
activation button on the object. The hand then carefully
places the object on the desk. Only after the object
has been placed does the transformation begin.

DEFAULT ENVIRONMENT:
Miniature macro photography. The object is approximately
10–15 cm in scale, placed on a dark wooden computer desk.
The background includes a computer monitor, RGB keyboard,
mouse, mousepad, and subtle RGB ambient lighting.
Use macro close-up framing, shallow depth of field,
realistic reflections, detailed materials, and believable shadows.

TRANSFORMATION:
The transformation must be continuous, mechanically detailed,
physically believable, and visually readable.
Show components moving, separating, rotating, extending,
folding, connecting, and locking into their final positions.
Do not use sudden morphing, teleportation, unexplained
disappearance, or instant replacement.

COMPLETION:
The final form must be completely assembled and recognizable
at 100 percent by the final frame. No incomplete parts.
Maintain consistent scale, lighting, camera orientation,
and object identity throughout the shot.

TIMING:
The total video duration must be exactly ${seconds} seconds.
Create a logical time progression from the hand activation,
object placement, transformation, and final reveal.
Do not exceed the requested duration.

VISUAL STYLE:
${visualStyle || "Miniature macro cinematic realism"}

ADDITIONAL DETAILS:
${extraDetails || "None"}

Describe camera movement, mechanical movements, lighting,
depth of field, reflections, atmosphere, and cinematic
final reveal.

Return only the finished English prompt.
No introduction, no explanation, no bullet points.
`;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          instructions,
          input: "Generate the requested transformation video prompt.",
          max_output_tokens: 1800
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return res.status(502).json({
        error: "OpenAI gagal memproses permintaan. Periksa konfigurasi model dan API."
      });
    }

    const prompt = (data.output || [])
      .filter(item => item.type === "message")
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n")
      .trim();

    if (!prompt) {
      return res.status(502).json({
        error: "AI tidak menghasilkan prompt."
      });
    }

    return res.json({ prompt });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error: "Terjadi kesalahan pada backend."
    });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Universal Transformation AI running on port ${PORT}`);
});
