const fs = require('fs')
const path = require('path')

const file = path.join(
  __dirname,
  '../node_modules/next/dist/compiled/@vercel/og/index.node.js'
)

const src = fs.readFileSync(file, 'utf8')

const patched = src.replace(
  /throw new Error\(\s*"lookupType: " \+ lookupTable\.lookupType \+ " - substFormat: " \+ subtable\.substFormat \+ " is not yet supported"\s*\)/,
  'return () => null'
)

if (patched === src) {
  console.log('[patch-satori] Already applied or pattern not found — skipping')
} else {
  fs.writeFileSync(file, patched)
  console.log('[patch-satori] Applied: unsupported Arabic ligature lookups now skip instead of throw')
}
