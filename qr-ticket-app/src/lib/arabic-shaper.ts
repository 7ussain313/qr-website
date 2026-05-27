// Pre-shapes Arabic text to Unicode Presentation Forms-B (U+FE70–U+FEFF) so satori
// can render correctly without needing OpenType ContextSubst (LookupType 5) support.
// indices: [0]=isolated, [1]=final, [2]=initial, [3]=medial
type Forms = readonly [number, number, number | null, number | null]

const FORMS: Readonly<Record<number, Forms>> = {
  0x0622: [0xfe81, 0xfe82, null, null], // ALEF WITH MADDA ABOVE
  0x0623: [0xfe83, 0xfe84, null, null], // ALEF WITH HAMZA ABOVE
  0x0624: [0xfe85, 0xfe86, null, null], // WAW WITH HAMZA ABOVE
  0x0625: [0xfe87, 0xfe88, null, null], // ALEF WITH HAMZA BELOW
  0x0626: [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c], // YEH WITH HAMZA ABOVE
  0x0627: [0xfe8d, 0xfe8e, null, null], // ALEF
  0x0628: [0xfe8f, 0xfe90, 0xfe91, 0xfe92], // BA
  0x0629: [0xfe93, 0xfe94, null, null], // TEH MARBUTA
  0x062a: [0xfe95, 0xfe96, 0xfe97, 0xfe98], // TEH
  0x062b: [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c], // THEH
  0x062c: [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0], // JEEM
  0x062d: [0xfea1, 0xfea2, 0xfea3, 0xfea4], // HAH
  0x062e: [0xfea5, 0xfea6, 0xfea7, 0xfea8], // KHAH
  0x062f: [0xfea9, 0xfeaa, null, null], // DAL
  0x0630: [0xfeab, 0xfeac, null, null], // THAL
  0x0631: [0xfead, 0xfeae, null, null], // REH
  0x0632: [0xfeaf, 0xfeb0, null, null], // ZAIN
  0x0633: [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4], // SEEN
  0x0634: [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8], // SHEEN
  0x0635: [0xfeb9, 0xfeba, 0xfebb, 0xfebc], // SAD
  0x0636: [0xfebd, 0xfebe, 0xfebf, 0xfec0], // DAD
  0x0637: [0xfec1, 0xfec2, 0xfec3, 0xfec4], // TAH
  0x0638: [0xfec5, 0xfec6, 0xfec7, 0xfec8], // ZAH
  0x0639: [0xfec9, 0xfeca, 0xfecb, 0xfecc], // AIN
  0x063a: [0xfecd, 0xfece, 0xfecf, 0xfed0], // GHAIN
  0x0641: [0xfed1, 0xfed2, 0xfed3, 0xfed4], // FA
  0x0642: [0xfed5, 0xfed6, 0xfed7, 0xfed8], // QAF
  0x0643: [0xfed9, 0xfeda, 0xfedb, 0xfedc], // KAF
  0x0644: [0xfedd, 0xfede, 0xfedf, 0xfee0], // LAM
  0x0645: [0xfee1, 0xfee2, 0xfee3, 0xfee4], // MEEM
  0x0646: [0xfee5, 0xfee6, 0xfee7, 0xfee8], // NOON
  0x0647: [0xfee9, 0xfeea, 0xfeeb, 0xfeec], // HEH
  0x0648: [0xfeed, 0xfeee, null, null], // WAW
  0x0649: [0xfeef, 0xfef0, null, null], // ALEF MAQSURA
  0x064a: [0xfef1, 0xfef2, 0xfef3, 0xfef4], // YEH
}

// Mandatory Lam-Alef ligatures: [isolated, final]
const LAM = 0x0644
const LAM_ALEF: Readonly<Record<number, readonly [number, number]>> = {
  0x0622: [0xfef5, 0xfef6],
  0x0623: [0xfef7, 0xfef8],
  0x0625: [0xfef9, 0xfefa],
  0x0627: [0xfefb, 0xfefc],
}

// Right-joining letters: only isolated + final forms (no initial/medial)
const RIGHT_JOINING = new Set([
  0x0622, 0x0623, 0x0624, 0x0625, 0x0627, 0x0629,
  0x062f, 0x0630, 0x0631, 0x0632, 0x0648, 0x0649,
])

function isDiacritic(cp: number): boolean {
  return (cp >= 0x064b && cp <= 0x065f) || cp === 0x0670
}

function isDual(cp: number): boolean {
  return cp in FORMS && !RIGHT_JOINING.has(cp)
}

function isJoining(cp: number): boolean {
  return cp in FORMS
}

// Convert Arabic base characters to their correct contextual presentation forms.
// Presentation form characters (FE70-FEFF) pass directly to glyph rendering,
// bypassing satori's OpenType GSUB shaping pipeline.
export function shapeArabic(text: string): string {
  if (!text) return text

  const chars: number[] = []
  for (const c of text) {
    const cp = c.codePointAt(0)
    if (cp !== undefined) chars.push(cp)
  }
  const n = chars.length
  const out: number[] = []
  let i = 0

  function skipDiacritics(start: number, dir: 1 | -1): number {
    let j = start
    while (j >= 0 && j < n && isDiacritic(chars[j]!)) j += dir
    return j
  }

  while (i < n) {
    const cp = chars[i]!

    if (isDiacritic(cp) || !(cp in FORMS)) {
      out.push(cp)
      i++
      continue
    }

    const prevIdx = skipDiacritics(i - 1, -1)
    const nextIdx = skipDiacritics(i + 1, 1)
    const prevCp = prevIdx >= 0 ? chars[prevIdx]! : null
    const nextCp = nextIdx < n ? chars[nextIdx]! : null

    // Mandatory Lam-Alef ligature
    if (cp === LAM && nextCp !== null && nextCp in LAM_ALEF) {
      const isFinal = prevCp !== null && isDual(prevCp)
      const lig = LAM_ALEF[nextCp]!
      out.push(isFinal ? lig[1] : lig[0])
      // preserve any diacritics sitting between Lam and Alef
      for (let j = i + 1; j < nextIdx; j++) out.push(chars[j]!)
      i = nextIdx + 1
      continue
    }

    // extendsLeft:  this char sends a connector leftward (toward next in logical order)
    //               only dual-joining chars can do this
    const extendsLeft = isDual(cp) && nextCp !== null && isJoining(nextCp)

    // extendsRight: this char receives a connector from the right (prev in logical order)
    //               requires prev to be dual-joining (it must be able to send leftward)
    const extendsRight = isJoining(cp) && prevCp !== null && isDual(prevCp)

    let fi: number
    if (extendsLeft && extendsRight) fi = 3 // medial
    else if (extendsLeft) fi = 2 // initial
    else if (extendsRight) fi = 1 // final
    else fi = 0 // isolated

    const forms = FORMS[cp]!
    out.push(forms[fi] ?? forms[0])
    i++
  }

  return out.map((cp) => String.fromCodePoint(cp)).join('')
}
