# Vendored Three.js

- Version: 0.186.1
- Source: https://www.npmjs.com/package/three/v/0.186.1
- License: MIT (see `THREE-LICENSE.txt`)

Files:

- `three.module.js` — jsDelivr-minified `build/three.module.min.js`.
- `three.core.js` — jsDelivr-minified `build/three.core.min.js`, saved under the name
  imported by `three.module.js` (`./three.core.js`). No source changes.
- `addons/geometries/RoundedBoxGeometry.js` — the official three.js addon.

The trailing source-map comments were removed from the minified files to avoid
404 requests. No runtime code was modified. Everything is served locally so the
X Player Card has no third-party JavaScript dependency at runtime.
