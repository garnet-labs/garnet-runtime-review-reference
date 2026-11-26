# Try Garnet Runtime Review on a pull request

1. Create an empty GitHub repository with `main` as its default branch. Copy this directory's **contents**, including the hidden `.github/` directory, into it.
2. Install the [Garnet GitHub App](https://github.com/apps/garnet-runtime-review) on the new repository. Commit the sample to `main` and wait for the CI job to finish so Garnet has a default-branch run to compare with.
3. On a branch, change `https://example.com/` to `https://example.org/` in [`.github/workflows/ci.yml`](.github/workflows/ci.yml). Push and open a pull request.
4. When CI finishes, open the Garnet Runtime Review comment. Look for the outbound connection to `example.org` under the `test` job and expand its execution chain. The chain follows execution from the runner's root to the outbound connection. Open the job's Execution Profile to inspect the full record.

Run the dependency-free test locally with `npm test` (Node.js 20 or newer). The outbound request is a separate step in CI.
