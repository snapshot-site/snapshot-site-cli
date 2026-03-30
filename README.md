# Snapshot Site CLI

[![npm](https://img.shields.io/npm/v/%40snapshot-site%2Fcli.svg)](https://www.npmjs.com/package/@snapshot-site/cli)
[![Node](https://img.shields.io/badge/node-%3E%3D20.9.0-339933.svg)](https://nodejs.org/)
[![License](https://img.shields.io/github/license/snapshot-site/snapshot-site-cli.svg?cacheSeconds=300)](https://github.com/snapshot-site/snapshot-site-cli/blob/main/LICENSE)
[![CI](https://github.com/snapshot-site/snapshot-site-cli/actions/workflows/tests.yml/badge.svg)](https://github.com/snapshot-site/snapshot-site-cli/actions/workflows/tests.yml)

Official CLI for the Snapshot Site API.

## Install

```bash
pnpm add -g @snapshot-site/cli
```

Create your API token in Snapshot Site Console:

- https://console.snapshot-site.com

## Usage

```bash
export SNAPSHOT_SITE_API_KEY=your_key

snapshot-site screenshot --url https://snapshot-site.com --full-size
snapshot-site analyze --url https://snapshot-site.com --enable-summary --enable-quality
snapshot-site compare --before-url https://snapshot-site.com --after-url https://staging.snapshot-site.com --full-size
```

## Login and local config

The CLI can persist your API key in a local config file:

```bash
snapshot-site login --api-key ss_live_xxx
snapshot-site whoami-config
snapshot-site logout
```

Config path:

```bash
~/.config/snapshot-site/config.json
```

Environment variables still work and override the saved config:

```bash
export SNAPSHOT_SITE_API_KEY=ss_live_xxx
export SNAPSHOT_SITE_BASE_URL=https://api.prod.ss.snapshot-site.com
```

## Complete examples

### Take a screenshot and save the PNG

```bash
snapshot-site screenshot \
  --url https://snapshot-site.com/pricing \
  --width 1440 \
  --full-size \
  --hide-cookie \
  --output ./pricing.json \
  --save-image ./pricing.png
```

### Analyze a page with summary and quality checks

```bash
snapshot-site analyze \
  --url https://snapshot-site.com \
  --width 1440 \
  --full-size \
  --enable-summary \
  --enable-quality \
  --output ./analysis.json \
  --save-image ./analysis.png
```

### Compare staging vs production and save before/after/diff

```bash
snapshot-site compare \
  --before-url https://snapshot-site.com/pricing \
  --after-url https://staging.snapshot-site.com/pricing \
  --width 1440 \
  --full-size \
  --hide-cookie \
  --threshold 0.1 \
  --output ./compare.json \
  --save-image ./compare-assets
```

### Compare from a JSON payload

```bash
snapshot-site compare \
  --input ./compare-payload.json \
  --output ./compare.json \
  --save-image ./compare-assets
```

## Save assets locally

```bash
snapshot-site screenshot --url https://snapshot-site.com --save-image
snapshot-site analyze --url https://snapshot-site.com --enable-quality --save-image ./analysis.png
snapshot-site compare --before-url https://snapshot-site.com --after-url https://staging.snapshot-site.com --save-image ./compare-output
```
