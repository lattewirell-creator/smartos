#!/bin/bash
# Builds the GNOME Shell extensions behind the Stupid OS look (tiling with gaps, blur,
# rounded corners, floating bar) from source at pinned versions, into a system-wide tree.
#
#   scripts/build-extensions.sh STAGE_DIR
#
# Extensions land in STAGE_DIR/usr/share/gnome-shell/extensions/<uuid>. Their settings schemas
# go to STAGE_DIR/usr/share/glib-2.0/schemas instead of the extension folder, so Stupid OS's
# schema override can set their defaults. Needs git, gettext, glib-compile-schemas, node/npm.
set -euo pipefail

STAGE="$(realpath "$1")"
SRC="${EXT_SRC:-/var/tmp/stupidos-extensions}"
EXT_DIR="$STAGE/usr/share/gnome-shell/extensions"
SCHEMA_DIR="$STAGE/usr/share/glib-2.0/schemas"
mkdir -p "$SRC" "$EXT_DIR" "$SCHEMA_DIR"

# name | git url | pinned tag or commit | uuid
EXTENSIONS="
blur-my-shell|https://github.com/aunetx/blur-my-shell|v76|blur-my-shell@aunetx
forge|https://github.com/forge-ext/forge|v49-89|forge@jmmaranan.com
rounded-window-corners|https://github.com/flexagoon/rounded-window-corners|12|rounded-window-corners@fxgn
openbar|https://github.com/neuromorph/openbar|01fb24217e|openbar@neuromorph
"

fetch() {  # name url ref
    local dir="$SRC/$1"
    [ -d "$dir/.git" ] || git clone -q "$2" "$dir"
    git -C "$dir" fetch -q --tags origin 2>/dev/null || true
    git -C "$dir" checkout -q --force "$3"
    git -C "$dir" clean -qfdx
    echo "$dir"
}

# Compile po/*.po into locale/<lang>/LC_MESSAGES/<domain>.mo
locales() {  # podir outdir domain
    for po in "$1"/*.po; do
        [ -e "$po" ] || continue
        local lang; lang=$(basename "$po" .po)
        mkdir -p "$2/locale/$lang/LC_MESSAGES"
        msgfmt "$po" -o "$2/locale/$lang/LC_MESSAGES/$3.mo"
    done
}

# Move an extension's schemas to the global schema dir
globalize_schemas() {  # extdir
    if [ -d "$1/schemas" ]; then
        cp "$1"/schemas/*.gschema.xml "$SCHEMA_DIR/"
        rm -rf "$1/schemas"
    fi
}

# A plain loop over lines (not `while read`): forge's build runs `git shortlog`, which would eat stdin
mapfile -t ROWS < <(grep . <<< "$EXTENSIONS")
for row in "${ROWS[@]}"; do
    IFS='|' read -r name url ref uuid <<< "$row"
    echo "[extensions] $name ($ref)"
    src=$(fetch "$name" "$url" "$ref")
    out="$EXT_DIR/$uuid"
    rm -rf "$out" && mkdir -p "$out"
    case "$name" in
        blur-my-shell)
            # What `gnome-extensions pack` does in their Makefile, without needing gnome-shell on the host
            cp -r "$src"/src/. "$out/"
            rm -rf "$out/styles"
            # St doesn't give CSS @imports the extension stylesheet's priority, so concatenate (as their Makefile does)
            make -s -C "$src" -p -n build 2>/dev/null | sed -n 's/^STYLESHEETS = //p' | head -1 \
                | tr ' ' '\n' | grep . | (cd "$src" && xargs cat) > "$out/stylesheet.css"
            cp "$src/metadata.json" "$src/LICENSE" "$out/"
            cp -r "$src/resources/icons" "$src/resources/ui" "$out/"
            mkdir -p "$out/schemas" && cp "$src"/schemas/*.gschema.xml "$out/schemas/"
            locales "$src/po" "$out" "blur-my-shell@aunetx"
            ;;
        forge)
            (cd "$src" && make -s metadata </dev/null >/dev/null 2>&1 || true)
            cp "$src/metadata.json" "$src/LICENSE" "$src"/*.js "$src"/*.css "$out/"
            cp -r "$src/resources" "$src/config" "$src/lib" "$src/schemas" "$out/"
            locales "$src/po" "$out" "forge"
            # Windows that must never be tiled: Buddy's ball and its overlays, and the installer
            python3 - "$out/config/windows.json" <<'PY'
import json, sys
path = sys.argv[1]
cfg = json.load(open(path))
ours = [{"wmClass": "stupid-buddy", "mode": "float"}, {"wmClass": "Stupid-buddy", "mode": "float"},
        {"wmClass": "calamares", "mode": "float"}, {"wmClass": "Calamares", "mode": "float"}]
cfg["overrides"] = ours + [o for o in cfg["overrides"] if o not in ours]
json.dump(cfg, open(path, "w"), indent=2)
PY
            # House colours for the focus borders; floating windows (like Buddy's ball) get none
            sed -i -e 's/rgba(236, 94, 94, 1)/rgba(217, 119, 87, 1)/' \
                   -e 's/rgba(255, 246, 108, 1)/rgba(236, 233, 225, 0.7)/' \
                   -e 's/rgba(247, 162, 43, 1)/rgba(224, 175, 104, 1)/' \
                   -e 's/rgba(17, 199, 224, 1)/rgba(122, 162, 196, 1)/' \
                   -e 's/rgba(180, 167, 214, 1)/rgba(0, 0, 0, 0)/g' "$out/stylesheet.css"
            grep -q 'rgba(217, 119, 87, 1)' "$out/stylesheet.css"
            ;;
        rounded-window-corners)
            (cd "$src" && npm ci --silent --no-audit --no-fund && npx tsc --outDir "$out")
            cp -r "$src"/resources/. "$out/"
            (cd "$src/src" && find . -type f ! -name '*.ts' -exec cp --parents {} "$out/" \;)
            locales "$src/po" "$out" "$uuid"
            ;;
        openbar)
            cp -r "$src/openbar@neuromorph/." "$out/"
            # Lift the dock's glass off the screen edge so it floats like the bar's islands
            python3 - "$out/stylesheets.js" <<'PY'
import sys
path = sys.argv[1]
js = open(path).read()
anchor = "        #dash StIcon {"
assert js.count(anchor) == 1, "openbar: dash anchor not found"
lift = """        #dashtodockContainer.bottom #dash .dash-background {
            margin-bottom: 10px !important;
        }
        #dashtodockContainer.bottom #dash .dash-item-container .app-well-app,
        #dashtodockContainer.bottom #dash .dash-item-container .show-apps,
        #dashtodockContainer.bottom #dash .dash-item-container .overview-tile {
            padding-top: 8px !important;
            padding-bottom: 20px !important;
        }
        #dashtodockContainer.bottom #dash .app-well-app-running-dot {
            margin-bottom: 13px !important;
        }
"""
open(path, "w").write(js.replace(anchor, lift + anchor))
PY
            ;;
    esac
    globalize_schemas "$out"
    python3 -c "import json,sys; m=json.load(open('$out/metadata.json')); assert '46' in m['shell-version'], m['shell-version']; print('  ok', m['uuid'], m.get('version',''))"
done
