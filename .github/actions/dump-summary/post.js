const fs = require("fs")
const file = process.env.GITHUB_STEP_SUMMARY
if (file && fs.existsSync(file)) {
    console.log("===== STEP SUMMARY DUMP BEGIN =====")
    console.log(fs.readFileSync(file, "utf8"))
    console.log("===== STEP SUMMARY DUMP END =====")
} else {
    console.log("no GITHUB_STEP_SUMMARY file")
}
