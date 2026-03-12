export type SongKey =
  | "나비야"
  | "둥글게 둥글게"
  | "아리랑"
  | "도라지 타령"
  | "군밤타령"
  | "밀양 아리랑";

export type SyllableCue = {
  syllable: string;
  start: number;
  end: number;
};

export type LyricLine = {
  t: number;
  d: number;
  txt: string;
  cues?: SyllableCue[];
};

export type SongMeta = {
  level: string;
  subtitle: string;
  accentClass: string;
  badgeClass: string;
  audioSrc: string;
  durationSec?: number;
  lyricLeadOffsetSec?: number;
  lyrics: LyricLine[];
};
