# SmartOS

Ett lugnt, snyggt och komplett operativsystem för vardagen. SmartOS bygger på Ubuntu 24.04 LTS, så du får stabiliteten, drivrutinerna och säkerhetsuppdateringarna (till 2029) från en av världens mest använda Linux-plattformar. Ovanpå ligger en egen design i varma krämtoner och terrakotta, samma känsla som i The Stupid Browser.

## Det här ingår

- **Skrivbord:** GNOME i SmartOS-design med en docka längst ner som döljer sig själv, typsnittet Inter, egna bakgrundsbilder för ljust och mörkt läge och en egen startskärm.
- **Appar från start:** webbläsare (Firefox), LibreOffice (Writer, Calc, Impress), Filer, Textredigerare, Terminal, Kalender, Kalkylator, Bilder, Video, Musik, Dokumentskanner, Säkerhetskopiering med mera.
- **Appbutik:** Programvara med Flathub inbyggt. Spotify, Slack, Zoom, VS Code, Steam och tusentals andra appar installeras med ett klick. Ingen Snap.
- **Drivrutiner:** hela Linux-firmwarepaketet, mikrokod för Intel och AMD, Mesa för grafik och skrivardrivrutiner. NVIDIA-drivrutiner installeras via *Ytterligare drivrutiner*.
- **Svenska som standard:** svenskt språk, tangentbord och tidszon i livesessionen. Installationsprogrammet låter dig välja något annat.
- **Installationsprogram:** Calamares i SmartOS-design med stöd för UEFI, Secure Boot, äldre BIOS och diskkryptering.

## Bygga ISO-filen

Det behövs en dator eller virtuell maskin med Ubuntu 24.04 och cirka 25 GB ledigt diskutrymme.

```bash
sudo ./build.sh
```

Färdig fil hamnar i `out/SmartOS-1.0-amd64.iso`. Har du redan byggt en gång och bara ändrat något i själva ISO-paketeringen räcker `sudo ./build.sh --iso-only`.

Bygget kan också köras på GitHub: gå till *Actions → Build SmartOS ISO → Run workflow*. Om du pushar en tagg som `v1.0` publiceras ISO-filen som en release. GitHub tillåter max 2 GB per fil, så ISO-filen delas upp i delar som du sätter ihop så här:

```bash
cat SmartOS-1.0-amd64.iso.part* > SmartOS-1.0-amd64.iso      # Mac och Linux
copy /b SmartOS-1.0-amd64.iso.part00+SmartOS-1.0-amd64.iso.part01 SmartOS-1.0-amd64.iso   # Windows
```

## Installera på en dator

1. Skriv ISO-filen till ett USB-minne (minst 8 GB) med [balenaEtcher](https://etcher.balena.io) eller Rufus.
2. Starta datorn från USB-minnet. Oftast trycker du F12, F11, F2 eller Esc direkt vid start för att få upp startmenyn.
3. Välj *Prova eller installera SmartOS*. Nu kör du SmartOS direkt från USB-minnet utan att något ändras på datorn.
4. Klicka på *Installera SmartOS* i dockan när du vill installera på riktigt.

Vill du testa i en virtuell maskin först kör du `./scripts/test-vm.sh` (behöver paketen `qemu-system-x86` och `ovmf`).

## Anpassa

| Vad | Var |
|---|---|
| Namn, version, standardspråk | `config/smartos.conf` |
| Vilka program som ingår | `config/packages.list` |
| Logotyp och bakgrundsbilder | `branding/` |
| Skrivbordets standardinställningar | `overlay/usr/share/glib-2.0/schemas/90_smartos.gschema.override` |
| Installationsprogrammet | `overlay/etc/calamares/` |
| Själva bygget | `build.sh` och `scripts/chroot-setup.sh` |

## Bra att veta

Namnet SmartOS används redan av ett serveroperativsystem från MNX (tidigare Joyent). Det spelar ingen roll för privat bruk, men ska du sprida eller sälja systemet bör du byta namn. Det gör du på ett ställe, i `config/smartos.conf`.

SmartOS bygger på Ubuntu, men är inte ett officiellt Ubuntu-system och har ingen koppling till Canonical.
