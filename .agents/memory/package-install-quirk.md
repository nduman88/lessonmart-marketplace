---
name: Targeted workspace package installs
description: Installing dependencies in this pnpm monorepo must target the owning workspace package.
---

The generic package installer may attempt to add packages at the workspace root and fail with pnpm's workspace-root check. Use the workspace package filter when a dependency belongs to one artifact.

**Why:** Root installs can fail before changing the intended package, leaving the artifact without the dependency it requested.

**How to apply:** For artifact dependencies, target the artifact package explicitly rather than adding the dependency to the monorepo root.