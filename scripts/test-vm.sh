#!/bin/bash
# Boots the ISO in a virtual machine so you can try Stupid OS without a USB stick.
#   ./scripts/test-vm.sh            UEFI boot (needs the ovmf package)
#   ./scripts/test-vm.sh --bios     legacy BIOS boot
set -euo pipefail
ISO=$(ls -1 "$(dirname "$0")"/../out/StupidOS-*-amd64.iso | tail -1)
DISK="${DISK:-/var/tmp/stupidos-test-disk.qcow2}"
[ -f "$DISK" ] || qemu-img create -f qcow2 "$DISK" 30G
FW=()
if [ "${1:-}" != "--bios" ]; then
    cp -n /usr/share/OVMF/OVMF_VARS_4M.fd /var/tmp/stupidos-ovmf-vars.fd
    FW=(-drive if=pflash,format=raw,readonly=on,file=/usr/share/OVMF/OVMF_CODE_4M.fd
        -drive if=pflash,format=raw,file=/var/tmp/stupidos-ovmf-vars.fd)
fi
ACCEL=(-accel tcg,thread=multi)
[ -e /dev/kvm ] && ACCEL=(-accel kvm -cpu host)
exec qemu-system-x86_64 "${ACCEL[@]}" -machine q35 -smp 4 -m 6144 "${FW[@]}" \
    -drive file="$DISK",if=virtio -cdrom "$ISO" -boot order=dc \
    -vga virtio -device qemu-xhci -device usb-tablet -nic user,model=virtio-net-pci "${@:2}"
