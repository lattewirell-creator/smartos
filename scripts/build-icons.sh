#!/bin/bash
# Builds the Stupid OS icon theme: Colloid (rounded, iOS-like app icons) with folders in the
# house terracotta, into a system-wide tree.
#
#   scripts/build-icons.sh STAGE_DIR
#
# Lands in STAGE_DIR/usr/share/icons/Colloid-Terracotta{-Light,-Dark}. Does what Colloid's own
# install.sh does for one colour, without running it.
set -euo pipefail

STAGE="$(realpath "$1")"
SRC="${ICON_SRC:-/var/tmp/stupidos-icons}/colloid"
REF="2026-08-10"
NAME="Colloid-Terracotta"
COLOR="#D97757"
DEST="$STAGE/usr/share/icons"

[ -d "$SRC/.git" ] || git clone -q https://github.com/vinceliuice/Colloid-icon-theme "$SRC"
git -C "$SRC" fetch -q --tags origin 2>/dev/null || true
git -C "$SRC" checkout -q --force "$REF"
git -C "$SRC" clean -qfdx
echo "[icons] Colloid ($REF) in $COLOR"

mkdir -p "$DEST"
LIGHT="$DEST/$NAME-Light" DARK="$DEST/$NAME-Dark"
rm -rf "$LIGHT" "$DARK"

index() {  # dir variant
    mkdir -p "$1"
    sed -e "s/^Name=Colloid/Name=$NAME$2/" \
        -e 's/^Inherits=.*/Inherits=Yaru,Adwaita,hicolor/' "$SRC/src/index.theme" > "$1/index.theme"
    cp "$SRC/LICENSE" "$1/"
}

# Folders and app icons in the house colour instead of Colloid's blue
tint() {  # dir
    cp "$SRC"/notint/*.svg "$1/places/scalable/"
    sed -i "s/#60c0f0/$COLOR/g" "$1"/places/scalable/*.svg
}

index "$LIGHT" -Light
cp -r "$SRC"/src/{actions,apps,categories,devices,emblems,mimetypes,places,status} "$LIGHT/"
tint "$LIGHT"
sed -i "s/#60c0f0/$COLOR/g" "$LIGHT"/apps/scalable/*.svg
cp -r "$SRC"/links/* "$LIGHT/"

index "$DARK" -Dark
mkdir -p "$DARK"/{apps,categories,devices,emblems,mimetypes,places,status}
cp -r "$SRC/src/actions" "$DARK/"
cp -r "$SRC"/src/apps/{22,symbolic} "$DARK/apps/"
cp -r "$SRC"/src/categories/{22,symbolic} "$DARK/categories/"
cp -r "$SRC/src/emblems/symbolic" "$DARK/emblems/"
cp -r "$SRC/src/mimetypes/symbolic" "$DARK/mimetypes/"
cp -r "$SRC"/src/devices/{16,22,24,32,symbolic} "$DARK/devices/"
cp -r "$SRC"/src/places/{16,22,24,scalable,symbolic} "$DARK/places/"
cp -r "$SRC"/src/status/{16,22,24,32,symbolic} "$DARK/status/"
cp -r "$SRC"/dark/*.svg "$DARK/places/scalable/"
# Light glyphs for the dark panel and menus
sed -i "s/#363636/#dedede/g" "$DARK"/{actions,devices,places,status}/{16,22,24}/*.svg \
    "$DARK"/{actions,devices,status}/32/*.svg "$DARK"/apps/22/*.svg "$DARK"/categories/22/*.svg \
    "$DARK"/{actions,apps,categories,devices,emblems,mimetypes,places,status}/symbolic/*.svg
tint "$DARK"
cp -r "$SRC"/links/actions/{16,22,24,32,symbolic} "$DARK/actions/"
cp -r "$SRC"/links/devices/{16,22,24,32,symbolic} "$DARK/devices/"
cp -r "$SRC"/links/places/{16,22,24,scalable,symbolic} "$DARK/places/"
cp -r "$SRC"/links/status/{16,22,24,32,symbolic} "$DARK/status/"
cp -r "$SRC"/links/apps/{22,symbolic} "$DARK/apps/"
cp -r "$SRC"/links/categories/{22,symbolic} "$DARK/categories/"
cp -r "$SRC/links/emblems/symbolic" "$DARK/emblems/"
cp -r "$SRC/links/mimetypes/symbolic" "$DARK/mimetypes/"
# The dark variant shares the full-colour icons with the light one
for d in apps/scalable devices/scalable categories/32 emblems/16 emblems/22 mimetypes/scalable; do
    ln -sfn "../../$NAME-Light/$d" "$DARK/$d"
done

for t in "$LIGHT" "$DARK"; do
    for d in actions apps categories devices emblems mimetypes places status; do
        ln -sfn "$d" "$t/$d@2x"
    done
done

# Some Colloid icons look too much like Apple's own: the App Store "A", Music, the grey Settings
# gear, Safari, the ⌘ key, Xcode's hammer, Disk Utility's drive, TextEdit, Clock, Time Machine.
# Drop them (the files behind the names, so every alias goes too); those apps get Yaru's icons.
for f in softwarecenter softwarecenter-debian softwarecenter-ubuntu software-properties \
         system-software-install system-software-update gnome-music preferences-system safari \
         input-keyboard jockey jockey-kde jockey-gtk org.gnome.DiskUtility org.gnome.baobab \
         org.gnome.TextEditor org.gnome.clocks org.gnome.DejaDup; do
    p="$LIGHT/apps/scalable/$f.svg"
    [ -e "$p" ] && rm -f "$(readlink -f "$p")"
    rm -f "$p"
done

# Colloid ships a few links to icons it doesn't have; drop them so lookups fall through to Yaru
broken=$(find "$LIGHT" "$DARK" -xtype l -print -delete | wc -l)
echo "  removed $broken dangling links"
echo "  ok $NAME $(du -sh "$DEST" | cut -f1)"
