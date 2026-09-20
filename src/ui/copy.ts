import type { ExhibitId } from '../game/case';

/** The handler: one voice, text only, on comms. Nothing here is a game rule; the rules live in game/. */

export const BOOT_LINES = [
  'LAPTOP  unregistered device · battery 71%',
  'LINK    patching into LSPD evidence server · LEONIDA STATE ARCHIVE',
  'CASE    26-4471 · ROBBERY / VEHICLE THEFT · SUSPECT: YOU',
  'WANTED  six stars',
  'SYNC    exhibits transfer to the state archive at 05:00. after that, it is permanent.',
  'ACCESS  the file store only opens if the alarm trips. tripping it starts your clock.',
];

export const BOOT_HANDLER =
  'Listen. You have no gun and no exit. What you have is a keyboard and the evidence before it syncs. Trip the alarm, edit fast.';

export const RULES: { tag: string; text: string; tone: 'amber' | 'cyan' | 'pink' | 'red' }[] = [
  {
    tag: 'CONCEAL',
    text: 'Cover what identifies you (amber outlines). Every target you hide takes heat off you.',
    tone: 'amber',
  },
  {
    tag: 'DO NOT TOUCH',
    text: 'Integrity seals (cyan outlines) prove a file is genuine. Disturb one and suspicion jumps. Too much and it is a tampering charge.',
    tone: 'cyan',
  },
  {
    tag: 'COVER IT OPAQUELY',
    text: 'A redaction you can read through is not a redaction. Faint or see-through edits will not hold. Black it out.',
    tone: 'pink',
  },
  {
    tag: 'STAY TIGHT',
    text: 'Changing far more of the frame than the target makes the file look tampered with.',
    tone: 'red',
  },
];

export const CLOCK_RULE =
  'Five minutes in total. The clock only runs while you are editing. When it runs out, everything you have not touched syncs as it is.';

export const TOOLS_LINE =
  'Tools: Retouch (draw) · Redact (shapes) · Overlay (stickers) · Relabel (text). Crop, resize, filters and frames are locked by the camera metadata.';

export const HANDLER: Record<ExhibitId, { line: string; extra?: string }> = {
  cctv: {
    line: 'Camera 04, Ramirez Mini Mart. That is your face and that is your jacket. The timecode and camera ID are stamped on the file by the recorder. Leave them alone.',
    extra:
      'Start here. Nothing on this one is close to a seal, so there is no excuse for touching one.',
  },
  anpr: {
    line: 'Traffic capture on Ocean Drive. They have your plate and they have the car. Cover the plate. Cover the whole car body as well: the plate on its own does not hide a red coupe.',
    extra:
      'Careful. Hide the car here and it does not go away: that weight moves to the witness photo, Exhibit 05. You will have to clear it there too.',
  },
  report: {
    line: 'The police report. Your name and the vehicle line. The evidence stamp and the custody hash prove it is genuine. Do not smudge them.',
  },
  broadcast: {
    line: 'It made the evening news. Name on the headline, vehicle in the strap. The channel bug and the ticker are not yours to touch.',
  },
  witness: {
    line: 'A bystander with a phone. Same car, different camera. Cover the body and the plate: they count separately, so you need both.',
    extra:
      'If you hid the car in the traffic capture, this is where its weight landed. Clear it here to take it off you.',
  },
};

/** What the handler says when a target lands short of full coverage. */
export function coverageVerdict(cover: number): { label: string; detail: string } {
  const pct = Math.round(cover * 100);
  if (cover >= 0.75) return { label: 'CONCEALED', detail: `${pct}% covered` };
  if (cover >= 0.4)
    return { label: 'PARTIAL', detail: `${pct}% covered · 75% needed for full credit` };
  if (cover > 0.02)
    return {
      label: 'TOO FAINT TO HOLD',
      detail: `${pct}% covered · 40% minimum, and cover it opaquely`,
    };
  return { label: 'EXPOSED', detail: 'untouched' };
}

export const TICKER = [
  'WAVE 88.3 · OVERNIGHT DESK',
  'LSPD reports unusual traffic on the state evidence server',
  'Ocean Drive northbound closed at 11th',
  'Witness photo circulating on social feeds',
  'Sunset 19:42 · 26 degrees · light onshore wind',
  'Archive sync scheduled 05:00',
];

export const VERDICT_COPY = {
  CLEAN_SLATE: {
    title: 'CLEAN SLATE',
    sub: 'You were never there.',
    body: 'The archive holds nothing that puts you in that store, on that street or behind that wheel.',
  },
  TAMPERING: {
    title: 'TAMPERING CHARGE',
    sub: 'The server logged every edit.',
    body: 'You touched too much that was not yours to touch. There is a new felony on the sheet, and the original charges are still there.',
  },
  SYNCED: {
    title: 'SYNCED',
    sub: 'Nothing changed.',
    body: 'The clock ran out with the evidence still standing. Everything went to the archive exactly as it was.',
  },
  PARTIAL: {
    title: 'PARTIAL',
    sub: 'The record is thinner than it was.',
    body: 'You took some of it off the file, but not enough. They will still come looking.',
  },
} as const;
