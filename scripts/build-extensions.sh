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
            ;;
        rounded-window-corners)
            (cd "$src" && npm ci --silent --no-audit --no-fund && npx tsc --outDir "$out")
            cp -r "$src"/resources/. "$out/"
            (cd "$src/src" && find . -type f ! -name '*.ts' -exec cp --parents {} "$out/" \;)
            locales "$src/po" "$out" "$uuid"
            ;;
        openbar)
            cp -r "$src/openbar@neuromorph/." "$out/"
            ;;
    esac
    globalize_schemas "$out"
    python3 -c "import json,sys; m=json.load(open('$out/metadata.json')); assert '46' in m['shell-version'], m['shell-version']; print('  ok', m['uuid'], m.get('version',''))"
done
