#!/bin/bash
# Builds the Stupid OS live/installer ISO.
#
#   sudo ./build.sh            full build
#   sudo ./build.sh --iso-only reuse the existing root filesystem, just repack the ISO
#
#   STUPID_APPS_DIR=/path/to/debs sudo -E ./build.sh
#       preinstall The Stupid Company apps from local .deb files instead of their GitHub releases
#
# Needs an Ubuntu 24.04 (or newer) host with about 25 GB free disk.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$ROOT_DIR/config/stupidos.conf"
WORK="${WORK:-/var/tmp/stupidos-work}"
CHROOT="$WORK/chroot"
ISO_DIR="$WORK/iso"
OUT_DIR="${OUT_DIR:-$ROOT_DIR/out}"
ISO_NAME="StupidOS-${DISTRO_VERSION}-amd64.iso"
ISO_ONLY=false
[ "${1:-}" = "--iso-only" ] && ISO_ONLY=true

log() { echo -e "\n\033[1;32m[stupidos] $*\033[0m"; }
die() { echo -e "\033[1;31m[stupidos] $*\033[0m" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root: sudo ./build.sh"

HOST_DEPS=(debootstrap squashfs-tools xorriso grub-pc-bin grub-efi-amd64-bin grub-efi-amd64-signed
           shim-signed mtools dosfstools librsvg2-bin imagemagick fonts-inter git gettext make npm)
missing=()
for p in "${HOST_DEPS[@]}"; do dpkg -s "$p" >/dev/null 2>&1 || missing+=("$p"); done
if [ ${#missing[@]} -gt 0 ]; then
    log "Installing build tools: ${missing[*]}"
    apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y "${missing[@]}"
fi

mount_chroot() {
    for d in dev dev/pts proc sys run; do
        mountpoint -q "$CHROOT/$d" || mount --bind "/$d" "$CHROOT/$d"
    done
}
umount_chroot() {
    for d in run sys proc dev/pts dev; do
        mountpoint -q "$CHROOT/$d" && umount -lf "$CHROOT/$d" || true
    done
}
trap umount_chroot EXIT

render_branding() {
    log "Rendering branding"
    local B="$ROOT_DIR/branding" S="$WORK/stage"
    rm -rf "$S" && mkdir -p "$S"
    cp -a "$ROOT_DIR/overlay/." "$S/"
    install -Dm644 "$ROOT_DIR/config/stupid-apps.json" "$S/usr/share/stupidos/stupid-apps.json"
    "$ROOT_DIR/scripts/build-extensions.sh" "$S"

    install -Dm644 "$B/wallpaper-light.svg" "$S/usr/share/backgrounds/stupidos/wallpaper-light.svg"
    install -Dm644 "$B/wallpaper-dark.svg"  "$S/usr/share/backgrounds/stupidos/wallpaper-dark.svg"
    install -Dm644 "$B/logo.svg" "$S/usr/share/icons/hicolor/scalable/apps/stupidos.svg"
    for s in 16 24 32 48 64 128 256 512; do
        mkdir -p "$S/usr/share/icons/hicolor/${s}x${s}/apps"
        rsvg-convert -w $s -h $s "$B/logo.svg" -o "$S/usr/share/icons/hicolor/${s}x${s}/apps/stupidos.png"
    done
    mkdir -p "$S/usr/share/pixmaps"
    rsvg-convert -w 256 "$B/logo.svg" -o "$S/usr/share/pixmaps/stupidos-logo.png"

    # Wordmarks: logo + name, light text for dark backgrounds
    local wm="$WORK/wordmark.svg"
    cat > "$wm" <<EOF
<svg xmlns="http://www.w3.org/2000/svg" width="880" height="200" viewBox="0 0 880 200">
  <g transform="translate(0,4) scale(0.375)">
    <rect x="16" y="16" width="480" height="480" rx="112" fill="#D97757"/>
    <path d="M 322 186 A 66 66 0 1 0 256 256 A 66 66 0 1 1 190 326" fill="none" stroke="#FAF9F5" stroke-width="46" stroke-linecap="round"/>
  </g>
  <text x="228" y="132" font-family="Inter" font-weight="600" font-size="112" letter-spacing="-2" fill="#ECE9E1">${DISTRO_NAME}</text>
</svg>
EOF
    rsvg-convert -w 380 "$wm" -o "$S/usr/share/pixmaps/stupidos-wordmark.png"
    rsvg-convert -w 228 "$wm" -o "$S/usr/share/pixmaps/stupidos-wordmark-small.png"

    # Boot splash: dark warm background, wordmark in the middle, spinner below
    local P="$S/usr/share/plymouth/themes/stupidos"
    mkdir -p "$P"
    cp "$S/usr/share/pixmaps/stupidos-wordmark.png" "$P/watermark.png"
    cat > "$P/stupidos.plymouth" <<'EOF'
[Plymouth Theme]
Name=Stupid OS
Description=Stupid OS boot splash
ModuleName=two-step

[two-step]
Font=Inter 12
TitleFont=Inter Light 24
ImageDir=/usr/share/plymouth/themes/stupidos
DialogHorizontalAlignment=.5
DialogVerticalAlignment=.382
TitleHorizontalAlignment=.5
TitleVerticalAlignment=.382
HorizontalAlignment=.5
VerticalAlignment=.75
WatermarkHorizontalAlignment=.5
WatermarkVerticalAlignment=.45
Transition=none
TransitionDuration=0.0
BackgroundStartColor=0x1f1e1d
BackgroundEndColor=0x1f1e1d
MessageBelowAnimation=true

[boot-up]
UseEndAnimation=false

[shutdown]
UseEndAnimation=false

[reboot]
UseEndAnimation=false

[updates]
SuppressMessages=true
ProgressBarShowPercentComplete=true
UseProgressBar=true
Title=Installerar uppdateringar...
SubTitle=Stäng inte av datorn

[system-upgrade]
SuppressMessages=true
ProgressBarShowPercentComplete=true
UseProgressBar=true
Title=Uppgraderar systemet...
SubTitle=Stäng inte av datorn

[firmware-upgrade]
SuppressMessages=true
ProgressBarShowPercentComplete=true
UseProgressBar=true
Title=Uppdaterar firmware...
SubTitle=Stäng inte av datorn
EOF

    # Installer images
    local CB="$S/etc/calamares/branding/stupidos"
    rsvg-convert -w 128 "$B/logo.svg" -o "$CB/logo.png"
    rsvg-convert -w 128 "$B/logo.svg" -o "$CB/icon.png"
    local welcome="$WORK/welcome.svg"
    sed -e 's/#ECE9E1/#191919/' "$wm" > "$welcome"
    rsvg-convert -w 520 "$welcome" -o "$CB/welcome.png"
}

build_rootfs() {
    if [ ! -x "$CHROOT/bin/bash" ]; then
        log "Bootstrapping Ubuntu ${UBUNTU_CODENAME}"
        mkdir -p "$WORK"
        debootstrap --arch=amd64 --variant=minbase "$UBUNTU_CODENAME" "$CHROOT" "$UBUNTU_MIRROR"
    fi
    render_branding
    mount_chroot
    rm -rf "$CHROOT/tmp/stupidos" && mkdir -p "$CHROOT/tmp/stupidos"
    cp -a "$ROOT_DIR/config" "$CHROOT/tmp/stupidos/"
    cp -a "$WORK/stage" "$CHROOT/tmp/stupidos/overlay"
    cp "$ROOT_DIR/scripts/chroot-setup.sh" "$CHROOT/tmp/stupidos/"
    # Optional local app packages (*-linux-amd64.deb); without them the apps come from GitHub releases
    mkdir -p "$CHROOT/tmp/stupidos/apps"
    if [ -d "${STUPID_APPS_DIR:-}" ]; then
        cp "$STUPID_APPS_DIR"/*-linux-amd64.deb "$CHROOT/tmp/stupidos/apps/" 2>/dev/null || true
    fi
    [ -L "$CHROOT/etc/resolv.conf" ] && rm -f "$CHROOT/etc/resolv.conf"
    cp -L /etc/resolv.conf "$CHROOT/etc/resolv.conf"
    # Pass the build host's proxy (if any) into the chroot
    chroot "$CHROOT" /usr/bin/env -i HOME=/root PATH=/usr/sbin:/usr/bin:/sbin:/bin TERM="${TERM:-xterm}" \
        http_proxy="${http_proxy:-}" https_proxy="${https_proxy:-}" HTTP_PROXY="${HTTP_PROXY:-}" HTTPS_PROXY="${HTTPS_PROXY:-}" \
        no_proxy="${no_proxy:-}" \
        /bin/bash /tmp/stupidos/chroot-setup.sh
    rm -f "$CHROOT/etc/resolv.conf"
    ln -sf ../run/systemd/resolve/stub-resolv.conf "$CHROOT/etc/resolv.conf"
    umount_chroot
}

build_iso() {
    log "Building the ISO image"
    rm -rf "$ISO_DIR" && mkdir -p "$ISO_DIR"/{casper,boot/grub,EFI/boot,.disk}

    local kernel initrd
    kernel=$(ls -1 "$CHROOT"/boot/vmlinuz-* | sort -V | tail -1)
    initrd=$(ls -1 "$CHROOT"/boot/initrd.img-* | sort -V | tail -1)
    cp "$kernel" "$ISO_DIR/casper/vmlinuz"
    cp "$initrd" "$ISO_DIR/casper/initrd"

    chroot "$CHROOT" dpkg-query -W --showformat='${Package} ${Version}\n' > "$ISO_DIR/casper/filesystem.manifest"
    printf '%s\n' casper calamares calamares-settings-ubuntu-common kdialog > "$ISO_DIR/casper/filesystem.manifest-remove"

    log "Compressing the root filesystem (takes a while)"
    rm -f "$ISO_DIR/casper/filesystem.squashfs"
    mksquashfs "$CHROOT" "$ISO_DIR/casper/filesystem.squashfs" \
        -comp xz -Xbcj x86 -b 1M -noappend -wildcards \
        -e 'proc/*' 'sys/*' 'dev/*' 'run/*' 'tmp/*' 'boot/efi/*'
    du -sx --block-size=1 "$CHROOT" | cut -f1 > "$ISO_DIR/casper/filesystem.size"

    local stamp
    stamp=$(date -u +%Y%m%d)
    echo "${DISTRO_NAME} ${DISTRO_VERSION} \"${DISTRO_CODENAME}\" - Release amd64 (${stamp})" > "$ISO_DIR/.disk/info"
    echo "full_cd/single" > "$ISO_DIR/.disk/cd_type"
    touch "$ISO_DIR/.disk/base_installable"
    echo "https://thestupidcompany.net" > "$ISO_DIR/.disk/release_notes_url"

    cat > "$ISO_DIR/boot/grub/grub.cfg" <<EOF
set timeout=5
set default=0
loadfont unicode
set menu_color_normal=light-gray/black
set menu_color_highlight=black/light-gray

menuentry "Prova eller installera ${DISTRO_NAME}" {
    set gfxpayload=keep
    linux   /casper/vmlinuz boot=casper quiet splash preempt=full locale=${LIVE_LOCALE} keyboard-configuration/layoutcode=${LIVE_KEYMAP} ---
    initrd  /casper/initrd
}
menuentry "Try or install ${DISTRO_NAME} (English)" {
    set gfxpayload=keep
    linux   /casper/vmlinuz boot=casper quiet splash preempt=full locale=en_US.UTF-8 keyboard-configuration/layoutcode=us ---
    initrd  /casper/initrd
}
menuentry "${DISTRO_NAME} i felsäkert grafikläge" {
    set gfxpayload=keep
    linux   /casper/vmlinuz boot=casper nomodeset quiet splash preempt=full locale=${LIVE_LOCALE} keyboard-configuration/layoutcode=${LIVE_KEYMAP} ---
    initrd  /casper/initrd
}
if [ "\$grub_platform" = "efi" ]; then
menuentry "UEFI-inställningar" {
    fwsetup
}
fi
EOF

    log "UEFI boot (Secure Boot via Ubuntu's signed shim and GRUB)"
    cp /usr/lib/shim/shimx64.efi.signed.latest "$ISO_DIR/EFI/boot/bootx64.efi" 2>/dev/null \
        || cp /usr/lib/shim/shimx64.efi.signed "$ISO_DIR/EFI/boot/bootx64.efi"
    cp /usr/lib/shim/mmx64.efi "$ISO_DIR/EFI/boot/mmx64.efi"
    cp /usr/lib/grub/x86_64-efi-signed/gcdx64.efi.signed "$ISO_DIR/EFI/boot/grubx64.efi"
    # Unsigned GRUB modules, used when Secure Boot is off
    mkdir -p "$ISO_DIR/boot/grub/x86_64-efi"
    cp /usr/lib/grub/x86_64-efi/*.mod /usr/lib/grub/x86_64-efi/*.lst "$ISO_DIR/boot/grub/x86_64-efi/"
    mkdir -p "$ISO_DIR/boot/grub/fonts"
    cp /usr/share/grub/unicode.pf2 "$ISO_DIR/boot/grub/fonts/unicode.pf2"

    local efiimg="$WORK/efiboot.img"
    rm -f "$efiimg"
    mkfs.msdos -C "$efiimg" 10240 >/dev/null
    mmd -i "$efiimg" ::/EFI ::/EFI/boot
    mcopy -i "$efiimg" "$ISO_DIR/EFI/boot/bootx64.efi" "$ISO_DIR/EFI/boot/mmx64.efi" "$ISO_DIR/EFI/boot/grubx64.efi" ::/EFI/boot/

    log "BIOS boot"
    local biosimg="$WORK/bios.img" corecfg="$WORK/grub-core.cfg"
    cat > "$corecfg" <<'EOF'
search --no-floppy --set=root --file /.disk/info
set prefix=($root)/boot/grub
configfile ($root)/boot/grub/grub.cfg
EOF
    grub-mkstandalone --format=i386-pc --output="$WORK/core.img" \
        --install-modules="linux16 linux normal iso9660 biosdisk memdisk search tar ls configfile echo test font gfxterm all_video" \
        --modules="linux normal iso9660 biosdisk search configfile" \
        --locales="" --fonts="" "boot/grub/grub.cfg=$corecfg"
    cat /usr/lib/grub/i386-pc/cdboot.img "$WORK/core.img" > "$biosimg"
    cp "$biosimg" "$ISO_DIR/boot/grub/bios.img"

    (cd "$ISO_DIR" && find . -type f ! -name md5sum.txt ! -path './boot/grub/bios.img' -print0 \
        | xargs -0 md5sum > md5sum.txt)

    mkdir -p "$OUT_DIR"
    rm -f "$OUT_DIR/$ISO_NAME"
    xorriso -as mkisofs \
        -iso-level 3 -full-iso9660-filenames -joliet -joliet-long -rational-rock \
        -volid "STUPIDOS_${DISTRO_VERSION//./_}" \
        -output "$OUT_DIR/$ISO_NAME" \
        --grub2-mbr /usr/lib/grub/i386-pc/boot_hybrid.img \
        -partition_offset 16 \
        --mbr-force-bootable \
        -append_partition 2 28732ac11ff8d211ba4b00a0c93ec93b "$efiimg" \
        -appended_part_as_gpt \
        -iso_mbr_part_type a2a0d0ebe5b9334487c068b6b72699c7 \
        -c '/boot.catalog' \
        -b '/boot/grub/bios.img' -no-emul-boot -boot-load-size 4 -boot-info-table --grub2-boot-info \
        -eltorito-alt-boot \
        -e '--interval:appended_partition_2:::' -no-emul-boot \
        "$ISO_DIR"

    (cd "$OUT_DIR" && sha256sum "$ISO_NAME" > "$ISO_NAME.sha256")
    log "Done: $OUT_DIR/$ISO_NAME ($(du -h "$OUT_DIR/$ISO_NAME" | cut -f1))"
}

$ISO_ONLY || build_rootfs
build_iso
