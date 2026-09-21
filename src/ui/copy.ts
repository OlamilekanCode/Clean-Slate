import type { ExhibitId } from '../game/case';

/** The handler: one voice, text only, on comms. Nothing here is a game rule; the rules live in game/. */

export const BOOT_LINES = [
  'LAPTOP  stolen · unregistered · battery 71%',
  'LINK    tapped into the LSPD evidence server · LEONIDA STATE ARCHIVE',
  'CASE    26-4471 · ROBBERY / GRAND THEFT AUTO · SUSPECT: YOU',
  'WANTED  six stars',
  'UPLOAD  every file goes to the state archive at 05:00. after that it is permanent.',
  'ACCESS  the file store only opens if the alarm trips. tripping it starts your clock.',
];

export const BOOT_HANDLER =
  'Listen. No gun, no getaway car. All you have is a laptop and a few minutes before the evidence hits the archive. Trip the alarm and get to work.';

export const RULES: { tag: string; text: string; tone: 'amber' | 'cyan' | 'pink' | 'red' }[] = [
  {
    tag: 'HIDE IT',
    text: 'Cover whatever puts you at the scene (amber outlines). Every target you hide cools you down.',
    tone: 'amber',
  },
  {
    tag: 'HANDS OFF',
    text: 'Proof stamps (cyan outlines) show a file is genuine. Mess with one and suspicion jumps. Too much and it is a tampering charge.',
    tone: 'cyan',
  },
  {
    tag: 'COVER IT SOLID',
    text: 'If they can see through it, it is not hidden. Faint or see-through edits will not fool anyone. Black it out.',
    tone: 'pink',
  },
  {
    tag: 'STAY TIGHT',
    text: 'Scribble over half the picture and the file looks doctored. Cover the target, not the whole shot.',
    tone: 'red',
  },
];

export const CLOCK_RULE =
  'Five minutes for the whole job. The clock only runs while you are in the editor. When it hits zero, every file you have not touched goes to the archive as it is.';

export const TOOLS_LINE =
  'Tools: Blackout (shapes) · Scribble (draw) · Stickers · Write (text). Crop, resize, filters and frames are locked by the camera.';

export const HANDLER: Record<ExhibitId, { line: string; extra?: string }> = {
  cctv: {
    line: 'Camera 04, Ramirez Mini Mart. That is your face and that is your jacket. The timecode and camera ID are stamped by the recorder itself. Leave them alone.',
    extra:
      'Start here. Nothing you need to hide is anywhere near a stamp, so there is no excuse for touching one.',
  },
  anpr: {
    line: 'Traffic camera on Ocean Drive. They have your plate and they have the car. Cover the plate. Cover the whole car body too: hiding the plate alone does not hide a red coupe.',
    extra:
      'Careful. Hide the car here and the heat does not vanish: it moves to the witness photo, Exhibit 05. You will have to clear it there as well.',
  },
  report: {
    line: 'The police report. Your name, and the line about the vehicle. The evidence stamp and the custody hash prove it is real. Do not smudge them.',
  },
  broadcast: {
    line: 'It made the evening news. Your name in the headline, the vehicle in the strap. The channel logo and the ticker are not yours to touch.',
  },
  witness: {
    line: 'Some bystander with a phone. Same car, different angle. Cover the body and the plate. They count separately, so you need both.',
    extra:
      'If you hid the car in the traffic cam shot, this is where the heat landed. Clear it here to shake it off.',
  },
};

/** What the handler says when a target lands short of full coverage. */
export function coverageVerdict(cover: number): { label: string; detail: string } {
  // Rounded down below full credit, so a 74.6% cover never reads as "75% covered, 75% needed".
  const pct = cover >= 0.75 ? Math.round(cover * 100) : Math.floor(cover * 100);
  if (cover >= 0.75) return { label: 'HIDDEN', detail: `${pct}% covered` };
  if (cover >= 0.4)
    return { label: 'HALF DONE', detail: `${pct}% covered · 75% needed for full credit` };
  if (cover > 0.02)
    return {
      label: 'TOO FAINT',
      detail: `${pct}% covered · 40% minimum, and cover it solid`,
    };
  return { label: 'SPOTTED', detail: 'untouched' };
}

export const VERDICT_COPY = {
  CLEAN_SLATE: {
    title: 'CLEAN SLATE',
    sub: 'You were never there.',
    body: 'The archive has nothing that puts you in that store, on that street or behind that wheel.',
  },
  TAMPERING: {
    title: 'TAMPERING CHARGE',
    sub: 'The server logged every move.',
    body: 'You touched too much that was not yours to touch. There is a new felony on your sheet, and the old charges are still there.',
  },
  SYNCED: {
    title: 'BUSTED',
    sub: 'Nothing you did helped.',
    body: 'You took no heat off the files, so they reached the archive as good as untouched. Six stars, and they know where to find you.',
  },
  PARTIAL: {
    title: 'STILL WANTED',
    sub: 'The record is thinner than it was.',
    body: 'You took some of it off the file, but not enough. They will still come looking.',
  },
} as const;
