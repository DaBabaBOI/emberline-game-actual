# Contributing to Emberline

Thanks for helping improve Emberline.

## Before you start

- Keep the project aligned with the game vision: sustainable civilization
  building, bright low-poly aesthetics, and strong trade-off mechanics.
- Prefer small, focused changes that are easy to review.
- Create another branch, not in main
- Follow the community expectations in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Development setup

```bash
git clone https://github.com/DaBabaBOI/emberline-game-actual.git
cd emberline-game-actual
npm install
npm run dev
```

## Branching and pull requests

Use a clear branch name based on the change type:

- `feat/...`
- `fix/...`
- `docs/...`
- `chore/...`

Pull requests should include:

- a short summary of the change
- why the change was needed
- screenshots or notes for gameplay/UI changes when useful
- validation details, including relevant commands run

GitHub provides bug and feature request forms in `.github/ISSUE_TEMPLATE/` and
uses `.github/pull_request_template.md` to guide pull request descriptions.

## Code conventions

- Keep game rules in `src/game/` and keep them free of React-specific code.
- Avoid mutating game state directly; prefer immutable update logic.
- Put new data-driven content in the relevant content file instead of scattering
  special cases in components.
- Preserve the tutorial flow and the core game design unless a change explicitly
  asks for a new design direction.

## Validation

Run the project checks before opening a PR:

```bash
npm run lint
npm run typecheck
npm run build
```

## Reporting issues

Use GitHub issues for bugs or feature requests. For security vulnerabilities,
please follow the guidance in [SECURITY.md](SECURITY.md).

## Community expectations

Please keep discussions constructive, respectful, and focused on the project.
See [ACCESSIBILITY.md](ACCESSIBILITY.md) for supported features, known
limitations, and how to report an accessibility barrier.
