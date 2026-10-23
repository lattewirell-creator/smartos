#!/bin/bash
# Runs inside the SmartOS root filesystem. Called by build.sh, never by hand.
set -euo pipefail

source /tmp/smartos/config/smartos.conf
export DEBIAN_FRONTEND=noninteractive
export LANG=C.UTF-8
APT_OPTS=(-y -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold)

log() { echo -e "\n\033[1;33m[chroot] $*\033[0m"; }

log "Package sources"
rm -f /etc/apt/sources.list
cat > /etc/apt/sources.list.d/ubuntu.sources <<EOF
Types: deb
URIs: ${UBUNTU_MIRROR}
Suites: ${UBUNTU_CODENAME} ${UBUNTU_CODENAME}-updates ${UBUNTU_CODENAME}-backports
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg

Types: deb
URIs: http://security.ubuntu.com/ubuntu/
Suites: ${UBUNTU_CODENAME}-security
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
EOF

# SmartOS uses Flatpak instead of Snap. Keep snapd out for good.
cat > /etc/apt/preferences.d/no-snap.pref <<'EOF'
Package: snapd
Pin: release a=*
Pin-Priority: -10
EOF

# Don't start services inside the build chroot
cat > /usr/sbin/policy-rc.d <<'EOF'
#!/bin/sh
exit 101
EOF
chmod +x /usr/sbin/policy-rc.d

echo "${LIVE_HOSTNAME}" > /etc/hostname
printf '127.0.0.1\tlocalhost\n127.0.1.1\t%s\n::1\tlocalhost ip6-localhost ip6-loopback\n' "${LIVE_HOSTNAME}" > /etc/hosts

apt-get update
apt-get "${APT_OPTS[@]}" install --no-install-recommends systemd-sysv dbus locales debconf-utils
apt-get "${APT_OPTS[@]}" full-upgrade

log "Locales"
sed -i -e 's/^# *\(en_US.UTF-8\)/\1/' -e 's/^# *\(sv_SE.UTF-8\)/\1/' /etc/locale.gen 2>/dev/null || true
locale-gen en_US.UTF-8 sv_SE.UTF-8
update-locale LANG="${LIVE_LOCALE}"
ln -sf "/usr/share/zoneinfo/${LIVE_TIMEZONE}" /etc/localtime
echo "${LIVE_TIMEZONE}" > /etc/timezone
cat > /etc/default/keyboard <<EOF
XKBMODEL="pc105"
XKBLAYOUT="${LIVE_KEYMAP}"
XKBVARIANT=""
XKBOPTIONS=""
BACKSPACE="guess"
EOF
echo "keyboard-configuration keyboard-configuration/layoutcode string ${LIVE_KEYMAP}" | debconf-set-selections

log "Installing packages (this is the long part)"
mapfile -t PKGS < <(grep -vE '^\s*(#|$)' /tmp/smartos/config/packages.list)
apt-get "${APT_OPTS[@]}" install --no-install-recommends "${PKGS[@]}"

log "Web browser"
BROWSER_DESKTOP="org.gnome.Epiphany.desktop"
if curl -fsSL --max-time 30 https://packages.mozilla.org/apt/repo-signing-key.gpg -o /tmp/mozilla.gpg; then
    install -d -m 0755 /etc/apt/keyrings
    gpg --dearmor < /tmp/mozilla.gpg > /etc/apt/keyrings/packages.mozilla.org.gpg 2>/dev/null \
        || cp /tmp/mozilla.gpg /etc/apt/keyrings/packages.mozilla.org.asc
    KEY=$(ls /etc/apt/keyrings/packages.mozilla.org.* | head -1)
    cat > /etc/apt/sources.list.d/mozilla.sources <<EOF
Types: deb
URIs: https://packages.mozilla.org/apt
Suites: mozilla
Components: main
Signed-By: ${KEY}
EOF
    cat > /etc/apt/preferences.d/mozilla.pref <<'EOF'
Package: *
Pin: origin packages.mozilla.org
Pin-Priority: 1000
EOF
    apt-get update
    apt-get "${APT_OPTS[@]}" install --no-install-recommends firefox firefox-l10n-sv-se
    BROWSER_DESKTOP="firefox.desktop"
else
    echo "Mozilla's repository is unreachable, installing GNOME Web instead."
    apt-get "${APT_OPTS[@]}" install --no-install-recommends epiphany-browser
fi
apt-get "${APT_OPTS[@]}" purge snapd 2>/dev/null || true

# Debs the installer uses to switch the bootloader package on BIOS machines
log "Offline bootloader packages"
mkdir -p /opt/smartos/debs
(cd /opt/smartos/debs && apt-get download grub-pc grub-gfxpayload-lists)

log "Branding: identity"
OS_RELEASE_TEXT="NAME=\"${DISTRO_NAME}\"
VERSION=\"${DISTRO_VERSION} (${DISTRO_CODENAME})\"
ID=${DISTRO_ID}
ID_LIKE=\"ubuntu debian\"
PRETTY_NAME=\"${DISTRO_NAME} ${DISTRO_VERSION}\"
VERSION_ID=\"${DISTRO_VERSION}\"
VERSION_CODENAME=${UBUNTU_CODENAME}
UBUNTU_CODENAME=${UBUNTU_CODENAME}
LOGO=smartos
HOME_URL=\"https://github.com/\"
SUPPORT_URL=\"https://help.ubuntu.com/\"
BUG_REPORT_URL=\"https://github.com/\""
# Divert so base-files upgrades never overwrite our identity
for f in /usr/lib/os-release /etc/lsb-release /etc/issue /etc/issue.net; do
    dpkg-divert --quiet --local --rename --add "$f"
done
echo "$OS_RELEASE_TEXT" > /usr/lib/os-release
ln -sf ../usr/lib/os-release /etc/os-release
cat > /etc/lsb-release <<EOF
DISTRIB_ID=${DISTRO_NAME}
DISTRIB_RELEASE=${DISTRO_VERSION}
DISTRIB_CODENAME=${UBUNTU_CODENAME}
DISTRIB_DESCRIPTION="${DISTRO_NAME} ${DISTRO_VERSION}"
EOF
echo "${DISTRO_NAME} ${DISTRO_VERSION} \\n \\l" > /etc/issue
echo "${DISTRO_NAME} ${DISTRO_VERSION}" > /etc/issue.net
# Ubuntu's login banner talks about Ubuntu Pro and snaps
chmod -x /etc/update-motd.d/* 2>/dev/null || true

log "Branding: files"
cp -a /tmp/smartos/overlay/. /
chmod +x /usr/bin/smartos-install /usr/libexec/smartos-* 2>/dev/null || true

# Default browser and dock favourites depend on which browser we got
sed -i "s/@BROWSER@/${BROWSER_DESKTOP}/" /usr/share/glib-2.0/schemas/90_smartos.gschema.override
xdg_mime_default() { echo "$2=$1"; }
{
    echo "[Default Applications]"
    for t in x-scheme-handler/http x-scheme-handler/https text/html application/xhtml+xml; do
        xdg_mime_default "$BROWSER_DESKTOP" "$t"
    done
} > /usr/share/applications/smartos-mimeapps.list
mkdir -p /etc/xdg && cp /usr/share/applications/smartos-mimeapps.list /etc/xdg/mimeapps.list
glib-compile-schemas /usr/share/glib-2.0/schemas

# GDM login screen
if [ -d /usr/share/gdm/dconf ]; then
    dconf compile /usr/share/gdm/greeter-dconf-defaults /usr/share/gdm/dconf
fi

# Boot splash
update-alternatives --install /usr/share/plymouth/themes/default.plymouth default.plymouth \
    /usr/share/plymouth/themes/smartos/smartos.plymouth 200
update-alternatives --set default.plymouth /usr/share/plymouth/themes/smartos/smartos.plymouth

# GRUB on the installed system
sed -i -e 's/^GRUB_TIMEOUT_STYLE=.*/GRUB_TIMEOUT_STYLE=hidden/' \
       -e 's/^GRUB_TIMEOUT=.*/GRUB_TIMEOUT=0/' \
       -e 's/^GRUB_CMDLINE_LINUX_DEFAULT=.*/GRUB_CMDLINE_LINUX_DEFAULT="quiet splash"/' /etc/default/grub
grep -q '^GRUB_DISABLE_OS_PROBER' /etc/default/grub || echo 'GRUB_DISABLE_OS_PROBER=false' >> /etc/default/grub

log "Services"
systemctl enable smartos-flathub.service NetworkManager.service gdm3.service 2>/dev/null || systemctl enable smartos-flathub.service NetworkManager.service
systemctl set-default graphical.target

log "Live session settings"
cat > /etc/casper.conf <<EOF
export USERNAME="${LIVE_USER}"
export USERFULLNAME="${DISTRO_NAME} Live"
export HOST="${LIVE_HOSTNAME}"
export BUILD_SYSTEM="Ubuntu"
export FLAVOUR="${DISTRO_NAME}"
EOF

log "Initramfs"
update-initramfs -u -k all

log "Cleanup"
apt-get "${APT_OPTS[@]}" autoremove --purge
apt-get clean
rm -f /usr/sbin/policy-rc.d
rm -rf /tmp/* /var/tmp/* /var/lib/apt/lists/* /root/.bash_history
truncate -s 0 /etc/machine-id
rm -f /var/lib/dbus/machine-id
ln -sf /etc/machine-id /var/lib/dbus/machine-id
