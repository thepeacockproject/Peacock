# Packaging / Tools

This folder contains some tools related to the build/packaging/deployment
infrastructure of the project.

- `build.mjs` - The esbuild configuration for the server in production.
- `buildTasks.mjs` - Pre-bundling of specific files.
- `devLoader.mjs` - Starts the server in the development environment.
- `esbuild-plugin-license.mjs` - esbuild plugin that automatically updates the
  THIRDPARTYNOTICES.txt file.
- `extractChallengeData.mjs` - a little CLI tool for downloading challenges from
  the IOI servers.
- `HOW_TO_USE.html` - legacy help file.
- `json5ToJson.mjs` - Converts a JSON5 file to a JSON file with the same name (
  but the JSON extension).
