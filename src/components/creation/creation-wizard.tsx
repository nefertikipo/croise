"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { CustomCluesInput } from "@/components/creation/custom-clues-input";

const VIBES = [
  { value: "classic", label: "Classic", desc: "Traditional crossword style" },
  { value: "easy-monday", label: "Easy Monday", desc: "Simple and accessible" },
  { value: "hard-saturday", label: "Hard Saturday", desc: "Expert-level wordplay" },
  { value: "millennial", label: "Millennial", desc: "2000s-2020s pop culture" },
  { value: "pop-culture", label: "Pop Culture", desc: "Movies, TV, music" },
  { value: "literary", label: "Literary", desc: "Literature and arts" },
];

const SIZES = [
  { value: "5", label: "Quick (5x5)", desc: "5-10 words, great for a warm-up" },
  { value: "11", label: "Standard (11x11)", desc: "~30 words, solid puzzle" },
  { value: "15", label: "Classic (15x15)", desc: "~75 words, full NYT size" },
];

export function CreationWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [language, setLanguage] = useState("en");
  const [size, setSize] = useState("15");
  const [difficulty, setDifficulty] = useState([3]);
  const [vibe, setVibe] = useState("classic");
  const [customClues, setCustomClues] = useState<{ answer: string; clue: string }[]>([]);
  const [theme, setTheme] = useState("");
  const [personalizationNotes, setPersonalizationNotes] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const validCustomClues = customClues.filter(
        (c) => c.answer.trim().length >= 3 && c.clue.trim().length > 0
      );

      const res = await fetch("/api/crosswords/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          size: Number(size),
          difficulty: difficulty[0],
          vibe,
          customClues: validCustomClues,
          theme: theme || undefined,
          personalizationNotes: personalizationNotes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Generation failed");
      }

      const data = await res.json();
      router.push(`/crossword/${data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    // Step 0: Settings
    <Card key="settings">
      <CardHeader>
        <CardTitle>Configure your crossword</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">French</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Grid size</Label>
            <Select value={size} onValueChange={(v) => v && setSize(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Difficulty: {difficulty[0]}/5</Label>
          <Slider
            value={difficulty}
            onValueChange={(v) => setDifficulty(Array.isArray(v) ? v : [v])}
            min={1}
            max={5}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Easy</span>
            <span>Hard</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Vibe</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {VIBES.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => setVibe(v.value)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  vibe === v.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="font-medium text-sm">{v.label}</div>
                <div className="text-xs text-muted-foreground">{v.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <Button onClick={() => setStep(1)} className="w-full">
          Next: Custom words
        </Button>
      </CardContent>
    </Card>,

    // Step 1: Custom clues
    <Card key="custom">
      <CardHeader>
        <CardTitle>Add personal touches</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <CustomCluesInput clues={customClues} onChange={setCustomClues} />

        <div className="space-y-2">
          <Label>Theme (optional)</Label>
          <Input
            placeholder="e.g. Cooking, Space exploration, 90s nostalgia"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Personal notes (optional)</Label>
          <Textarea
            placeholder="e.g. This is for my friend Sarah who loves cats and lives in Lyon"
            value={personalizationNotes}
            onChange={(e) => setPersonalizationNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
            Back
          </Button>
          <Button onClick={handleGenerate} disabled={loading} className="flex-1">
            {loading ? "Generating..." : "Generate crossword"}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
      </CardContent>
    </Card>,
  ];

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        {["Settings", "Personalize"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i <= step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm ${
                i <= step ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {i < 1 && (
              <div className="w-8 h-px bg-border" />
            )}
          </div>
        ))}
      </div>

      {steps[step]}
    </div>
  );
}
