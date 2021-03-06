# Daily Reporter

A utility that helps to create standardized daily reports by automatically filling parts of the email such as the contents, including date, greeting customized to match the time of day when writing, or the signature of the email.

The reporter interactively asks You for it's config on the first run & for the tasks You want to include in a daily report each time it is run.

Settings (`config.json`) & recipients (`recipients.json`) are automatically checked & sanitized if needed.

## Contents

- [Daily Reporter](#daily-reporter)
  - [Contents](#contents)
  - [Scripts](#scripts)
  - [Screenshots](#screenshots)
  - [Binary download](#binary-download)

## Scripts

The utility can either be run in development mode, watching for source file changes with `npm run dev` / `npm run start` (they are equivalent), or it can be packaged to an executable file with `npm run package`.

Also, `npm run build` is available, which transpiles TypeScript code from `src/` to JavaScript in `build/`. This command is called by `npm run package` before the actual binary packaging process.

## Screenshots

<figure>
  <img src="promo/screenshotConfig.jpg" alt="First time configuration">
  <figcaption>First time configuration</figcaption>
</figure>

<figure>
  <img src="promo/screenshotRunning.jpg" alt="Utility running">
  <figcaption>Utility running</figcaption>
</figure>

## Binary download

This repository utilizes Github workflows to automatically transpile, package & release a binary distribution of the tool. You can find the newest version on the [releases page](https://github.com/artus9033/daily-reporter/releases).
