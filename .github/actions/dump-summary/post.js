const fs = require("fs")
const path = require("path")
const own = process.env.GITHUB_STEP_SUMMARY
if (!own) {
    console.log("no GITHUB_STEP_SUMMARY env")
    process.exit(0)
}
const dir = path.dirname(own)
const files = fs.readdirSync(dir).filter((name) => name.startsWith("step_summary_"))
console.log("===== STEP SUMMARY DUMP BEGIN =====")
for (const name of files) {
    const p = path.join(dir, name)
    let text = ""
    try {
        text = fs.readFileSync(p, "utf8")
    } catch (e) {
        continue
    }
    if (text.trim() === "") continue
    console.log(`----- ${name} (${text.length} bytes) -----`)
    console.log(text)
}
console.log("===== STEP SUMMARY DUMP END =====")
