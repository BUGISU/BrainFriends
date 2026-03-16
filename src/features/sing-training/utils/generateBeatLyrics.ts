import { LyricLine, SyllableCue } from "@/features/sing-training/types";

export type BeatLineInput = {
  line: string;
  t: number;
  beat: number;
  durations?: number[];
};

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function generateBeatCues(
  line: string,
  beat: number,
  durations?: number[],
): SyllableCue[] {
  const chars = Array.from(line);
  let cursor = 0;

  return chars.map((char, index) => {
    const units =
      durations && typeof durations[index] === "number" ? durations[index] : 1;
    const start = round(cursor);
    const end = round(cursor + beat * units);
    cursor = end;

    return {
      syllable: char,
      start,
      end,
    };
  });
}

export function generateBeatLine(input: BeatLineInput): LyricLine {
  const cues = generateBeatCues(input.line, input.beat, input.durations);
  const lastCue = cues[cues.length - 1];

  return {
    t: round(input.t),
    d: lastCue ? round(lastCue.end) : 0,
    txt: input.line,
    cues,
  };
}

export function generateBeatLyrics(lines: BeatLineInput[]): LyricLine[] {
  return lines.map(generateBeatLine);
}
