# Useless Box — Task List

## Foundation
- [x] Inspect the Pong Player Card template and embed constraints
- [x] Create the project skeleton, local dev server, and static hosting files
- [x] Vendor pinned Three.js and the rounded-box geometry addon with license

## Models and data
- [x] Define pure interaction state machine
- [x] Define deterministic animation timeline and cue schedule
- [x] Implement and unit-test two-bone arm IK
- [x] Implement procedural wood, felt, label, and studio-environment textures

## Feature slices
- [x] Build the wooden box, split lid, clasp, hinges, and interior mechanism
- [x] Build the acrylic two-segment finger and chrome joints
- [x] Build the metal toggle switch, PUSH decal, LED, and hover ring
- [x] Implement camera rig, lighting, shadows, and responsive framing
- [x] Implement pointer/keyboard interaction and accessibility
- [x] Implement synthesized Web Audio cues and mute control
- [x] Build the hint overlay, sound button, error fallback, and debug modes

## Verification
- [x] Run Node syntax checks and unit tests (21/21 passing)
- [x] Start the local server and verify page initialization headlessly
- [x] Verify pointer activation, audio unlock, full cycle, and final pose with CDP
- [x] Capture and inspect idle/open/action stills at 300, 480, 600, and 390x844
- [x] Tune camera, materials, lighting, and animation timing
- [x] Generate the 480x480 preview.png
- [x] Verify Player Card metadata and iframe-friendly headers

## Documentation and handoff
- [x] Write SPEC.md with architecture, state machine, timeline, and test plan
- [x] Write README.md with local development, deployment, and X embed instructions
- [x] Update TODO.md and prepare the final summary

## Deployment
- [x] Commit the project and create `xyzzyapps/useless-box`
- [x] Push `main` and enable GitHub Pages from the repository root
- [x] Verify the live page, assets, Player Card metadata, and iframe headers
- [ ] Validate the X Player Card in a normal logged-in browser (headless validation is blocked with HTTP 403)
- [x] Commit the completed work

## Sound redesign
- [x] Replace sawtooth servo/creak oscillators that read as brass with layered motor noise, low-frequency hum, amplitude modulation, and randomized gear chatter
- [x] Add distinct start/stop mechanical transients for the lid and acrylic arm
- [x] Tighten switch clicks and separate mechanical contact sounds from body thunks
- [x] Add a debug-only sound audition panel for reviewing each cue in isolation
- [x] Check peak levels in Chrome with an analyser and verify no clipping
- [x] Add a higher, fax-like electronic handshake and servo whine
- [x] Await user audition and sound approval
- [x] Update SPEC/README, commit, and deploy the revised sound to GitHub Pages (`d7375c7`)
