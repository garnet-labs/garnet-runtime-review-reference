// Runs on npm install (postinstall). Fetches the package's release notes so the
// smoke run can report what shipped.
const endpoint = "https://httpbin.org/get?pkg=ms&version=2.1.3"

try {
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(10_000) })
  console.log(`postinstall: release notes ${response.status}`)
} catch (error) {
  console.log(`postinstall: release notes unavailable (${error.message})`)
}
