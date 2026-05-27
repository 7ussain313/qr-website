const fs = require('fs')
const path = require('path')

const file = path.join(
  __dirname,
  '../node_modules/next/dist/compiled/@vercel/og/index.node.js'
)

let src = fs.readFileSync(file, 'utf8')
let changed = false

// Patch 1: prevent crash on ContextSubstFormat3 (LookupType 5, SubstFormat 3)
// This lookup type is used by rlig in NotoSansArabic but satori does not implement it.
const p1Pattern = /throw new Error\(\s*"lookupType: " \+ lookupTable\.lookupType \+ " - substFormat: " \+ subtable\.substFormat \+ " is not yet supported"\s*\)/
if (p1Pattern.test(src)) {
  src = src.replace(p1Pattern, 'return () => null')
  console.log('[patch-satori] Applied patch 1: unsupported lookup types skip instead of throw')
  changed = true
} else {
  console.log('[patch-satori] Patch 1: already applied or pattern not found — skipping')
}

// Patch 2: add SUBSTITUTIONS[21] handler for LookupType 2 (Multiple Substitution).
// NotoSansArabic uses MultipleSubst with single-element sequences for fina/init/medi features.
// Without this handler, applySubstitution silently ignores id=21 and Arabic letters never get
// their contextual forms — they all render as isolated glyphs.
const p2Old = [
  'var SUBSTITUTIONS = {',
  '  11: singleSubstitutionFormat1$1,',
  '  12: singleSubstitutionFormat2$1,',
  '  63: chainingSubstitutionFormat3$1,',
  '  41: ligatureSubstitutionFormat1$1',
  '};',
].join('\n')

const p2New = [
  'var SUBSTITUTIONS = {',
  '  11: singleSubstitutionFormat1$1,',
  '  12: singleSubstitutionFormat2$1,',
  '  21: function(action, tokens, index) {',
  '    var subst = Array.isArray(action.substitution) ? action.substitution[0] : action.substitution;',
  '    if (subst != null) tokens[index].setState(action.tag, subst);',
  '  },',
  '  63: chainingSubstitutionFormat3$1,',
  '  41: ligatureSubstitutionFormat1$1',
  '};',
].join('\n')

if (src.includes(p2Old)) {
  // Use function form of replace to avoid $-escape issues in replacement string
  src = src.replace(p2Old, () => p2New)
  console.log('[patch-satori] Applied patch 2: SUBSTITUTIONS[21] added for Arabic MultipleSubst shaping')
  changed = true
} else if (src.includes('21: function(action')) {
  console.log('[patch-satori] Patch 2: already applied — skipping')
} else {
  console.log('[patch-satori] Patch 2: SUBSTITUTIONS pattern not found — skipping')
}

if (changed) {
  fs.writeFileSync(file, src)
  console.log('[patch-satori] Saved.')
} else {
  console.log('[patch-satori] No changes written.')
}
