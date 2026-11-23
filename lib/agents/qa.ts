// QA Lab: rule-based checks that run on every story before it is rendered.
// Claude's review (in claude.ts) runs after these in live mode.

import type { Story } from "../types";

export const LIMITS = { narration: 110, line: 80, title: 48, minBeats: 3, maxBeats: 8 };

function trimTo(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max / 2)).trimEnd()}…`;
}

/**
 * Fixes what can be fixed mechanically and reports what it changed.
 * Returns problems that can't be fixed (the story should be rejected) separately.
 */
export function checkStory(input: Story): { story: Story; fixes: string[]; blockers: string[] } {
  const story: Story = structuredClone(input);
  const fixes: string[] = [];
  const blockers: string[] = [];
  const n = story.characters.length;

  if (n === 0) blockers.push("The story has no characters.");
  if (story.characters.length > 3) {
    story.characters = story.characters.slice(0, 3);
    fixes.push("Cut the cast to 3 characters.");
  }
  if (story.title.length > LIMITS.title) {
    story.title = trimTo(story.title, LIMITS.title);
    fixes.push("Shortened the title.");
  }
  if (story.beats.length > LIMITS.maxBeats) {
    story.beats = story.beats.slice(0, LIMITS.maxBeats);
    fixes.push(`Cut the story to ${LIMITS.maxBeats} beats.`);
  }

  story.beats.forEach((b, i) => {
    const label = `Beat ${i + 1}`;
    const valid = b.cast.filter((c) => c.who >= 0 && c.who < story.characters.length);
    if (valid.length !== b.cast.length) fixes.push(`${label}: removed a character who doesn't exist.`);
    b.cast = valid.slice(0, 3);
    if (b.speaker >= story.characters.length || (b.speaker >= 0 && !b.line.trim())) {
      b.speaker = -1;
      b.line = "";
      fixes.push(`${label}: dropped a broken line of dialogue.`);
    }
    if (b.speaker >= 0 && !b.cast.some((c) => c.who === b.speaker)) {
      if (b.cast.length < 3) {
        b.cast.push({ who: b.speaker, mood: "happy", action: "enter" });
        fixes.push(`${label}: brought ${story.characters[b.speaker].name} on screen to say their line.`);
      } else {
        b.speaker = -1;
        b.line = "";
        fixes.push(`${label}: dropped a line from a character who wasn't on screen.`);
      }
    }
    if (b.cast.length === 0 && story.characters.length) {
      b.cast = [{ who: 0, mood: "thinking", action: "idle" }];
      fixes.push(`${label}: nobody was on screen, so added ${story.characters[0].name}.`);
    }
    if (b.narration.length > LIMITS.narration) {
      b.narration = trimTo(b.narration, LIMITS.narration);
      fixes.push(`${label}: shortened the narration.`);
    }
    if (b.line.length > LIMITS.line) {
      b.line = trimTo(b.line, LIMITS.line);
      fixes.push(`${label}: shortened the dialogue.`);
    }
    if (!b.narration.trim() && !b.line.trim()) blockers.push(`${label} has no narration and no dialogue.`);
  });

  if (story.beats.length < LIMITS.minBeats) blockers.push(`Only ${story.beats.length} beats; a story needs at least ${LIMITS.minBeats}.`);
  story.hashtags = story.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).slice(0, 6);
  return { story, fixes, blockers };
}
