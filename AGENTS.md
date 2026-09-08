# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Project conventions

## Imports

Use the `@/*` alias for anything under `src/` — `@/components/ui`, not
`../../components/ui`. Only same-folder imports stay relative (`./TabBar`).

The alias is declared in `tsconfig.json` (`paths`) and mapped for Jest in
`jest.config.js`. Expo's Metro bundler resolves it natively; restart the dev
server after changing `tsconfig.json`.

## Where code goes

- **One screen per file**, under `src/screens/<feature>/`. Export it from that
  folder's `index.ts`, and import screens via the folder (`@/screens/home`).
- Pieces used by a single feature live in that feature's own folder — see
  `src/screens/sessions/components/` for the pattern. Promote something to
  `src/components/` only once a second feature needs it.
- `src/components/` is split by role: `ui/` (design-system primitives),
  `feedback/` (toasts, skeletons, empty and error states), `media/`, and
  `overlays/` (modals and sheets mounted above the active screen).
- Inside `src/components/**`, import concrete files (`@/components/ui/Avatar`),
  never the barrels — barrels are for consumers, and importing them from within
  the library creates evaluation cycles.
- Backend calls belong in `src/lib/supabase/<domain>.ts`, reached through the
  `@/lib/supabase` barrel.

## Styles

Style rules live in `src/styles/sheets/`, one file per feature; `appStyles.ts`
only composes them. Add a rule to the sheet for the screen that needs it, or to
`sheets/shared.ts` if more than one feature uses it — then read it as
`styles.yourRule` exactly as before.

Reach for a token in `src/styles/tokens.ts` (type scale, spacing, radii,
shadows, `HIT_SLOP`) rather than a raw number. Theme colours come from the `c`
argument each sheet receives, so light / dark / midnight keep working.

## Checks

Run `npm run validate` (type-check + tests) before calling a change done.
