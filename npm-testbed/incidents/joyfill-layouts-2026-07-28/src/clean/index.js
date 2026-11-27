// Replay fixture — clean baseline version. Pure computation, no network.
// Mirrors the shape of @joyfill/layouts@0.1.1 (the last version examined by
// Socket that does NOT contain the implant).
const gridLayout = (fields, columns) => {
  const out = []
  fields.forEach((field, index) => {
    out.push({ field, row: Math.floor(index / columns), column: index % columns })
  })
  return out
}

module.exports = { gridLayout, version: '0.1.1' }
