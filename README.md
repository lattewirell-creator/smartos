# Stupid OS

Ett operativsystem från [The Stupid Company](https://thestupidcompany.net).

Ett lugnt, snyggt och komplett operativsystem för vardagen. Stupid OS bygger på Ubuntu 24.04 LTS, så du får stabiliteten, drivrutinerna och säkerhetsuppdateringarna (till 2029) från en av världens mest använda Linux-plattformar. Ovanpå ligger en egen design i varma krämtoner och terrakotta och hela familjen av appar från The Stupid Company.

## Det här ingår

- **Skrivbord:** GNOME med ett utseende i Hyprland-anda: fönster som lägger sig sida vid sida automatiskt med luft emellan, rundade hörn, glaseffekt, en svävande toppbar i öar och en terrakottafärgad ram runt fönstret du jobbar i. Dockan fungerar som på en Mac: ikonerna förstoras när du drar musen över dem, appar studsar när de startar och fönster sugs ner i dockan när du minimerar dem. Fönster zoomar mjukt in och ut när de öppnas och stängs, som appar på iOS. Mörkt läge som standard, typsnittet Inter, egna bakgrundsbilder och en egen startskärm.
- **The Stupid Company-appar:** The Stupid Browser är standardwebbläsare, The Stupid Mail sköter mejlen och The Stupid Buddy är systemets AI-assistent. Tryck **Super+Mellanslag** var du än är, skriv eller säg vad du vill ha hjälp med, så öppnar Buddy appar, ändrar inställningar, letar fram filer och skriver texter åt dig.
- **Stupid Apps:** varje dag kollar Stupid OS efter nya versioner av apparna och installerar dem automatiskt. Nya appar från The Stupid Company dyker upp av sig själva, se nedan.
- **Fler appar från start:** LibreOffice (Writer, Calc, Impress), Filer, Textredigerare, Terminal, Kalender, Kalkylator, Bilder, Video, Musik, Dokumentskanner, Säkerhetskopiering med mera.
- **Appbutik:** Programvara med Flathub inbyggt. Spotify, Slack, Zoom, VS Code, Steam och tusentals andra appar installeras med ett klick. Ingen Snap.
- **Snabbt och mjukt:** komprimerat swap-minne i RAM (zram) gör att datorn inte segar ner när minnet tar slut, kärnan prioriterar det du gör just nu och skärmar med 120 Hz eller mer kan köras med variabel uppdateringsfrekvens. Datorn väntar inte heller på nätverket när den startar.
- **Drivrutiner:** hela Linux-firmwarepaketet, mikrokod för Intel och AMD, Mesa för grafik och skrivardrivrutiner. NVIDIA-drivrutiner installeras via *Ytterligare drivrutiner*.
- **Svenska som standard:** svenskt språk, tangentbord och tidszon i livesessionen. Installationsprogrammet låter dig välja något annat.
- **Installationsprogram:** Calamares i Stupid OS-design med stöd för UEFI, Secure Boot, äldre BIOS och diskkryptering.

## Installera på en dator

1. Ladda ner [StupidOS-1.0-amd64.iso](https://github.com/lattewirell-creator/smartos/releases/latest/download/StupidOS-1.0-amd64.iso). Länken ger alltid den senaste versionen.
2. Skriv filen till ett USB-minne på minst 8 GB med [balenaEtcher](https://etcher.balena.io): välj filen, välj USB-minnet och klicka på *Flash*.
3. Starta datorn från USB-minnet. Oftast trycker du F12, F11, F2 eller Esc direkt vid start för att få upp startmenyn.
4. Välj *Prova eller installera Stupid OS*. Nu kör du Stupid OS direkt från USB-minnet utan att något ändras på datorn.
5. Klicka på *Installera Stupid OS* i dockan när du vill installera på riktigt.

Vill du testa i en virtuell maskin först kör du `./scripts/test-vm.sh` (behöver paketen `qemu-system-x86` och `ovmf`).

## Bygga ISO-filen

Det behövs en dator eller virtuell maskin med Ubuntu 24.04 och cirka 25 GB ledigt diskutrymme.

```bash
sudo ./build.sh
```

Färdig fil hamnar i `out/StupidOS-1.0-amd64.iso`. Har du redan byggt en gång och bara ändrat något i själva ISO-paketeringen räcker `sudo ./build.sh --iso-only`.

Bygget kan också köras på GitHub: gå till *Actions → Build Stupid OS ISO → Run workflow*. Varje bygge publiceras som en ny release och blir det som nedladdningslänken ovan pekar på. Pushar du en tagg som `v1.0` får releasen det namnet.

## Kortkommandon

| Tangent | Gör |
|---|---|
| Super+Mellanslag | Fråga Buddy |
| Super+piltangent | Flytta fokus till fönstret åt det hållet |
| Shift+Super+piltangent | Flytta fönstret |
| Ctrl+Super+piltangent | Byt plats på två fönster |
| Super+C | Låt fönstret sväva fritt / lägg tillbaka det i rutnätet |
| Super+W | Slå av eller på automatisk fönsterplacering |
| Super+F | Helskärm |
| Super+Q | Stäng fönstret |

Automatisk fönsterplacering går också att slå av och på i snabbinställningarna uppe till höger.

## Stupid Apps

Listan över The Stupid Company-appar ligger i `config/stupid-apps.json`. Varje Stupid OS-dator läser listan härifrån en gång om dagen, installerar appar som saknas och uppdaterar de som har en nyare version. Så här lägger du till en ny app:

1. Se till att appens GitHub-release innehåller en Linux-fil vars namn slutar på `-linux-amd64.deb`. Browser, Mail och Buddy bygger den automatiskt när du publicerar en release.
2. Lägg till appen i `config/stupid-apps.json` och pusha till `main`.

Klart. Inom ett dygn finns appen på alla datorer. Vill du se läget på en dator kör du `stupid-apps list`, och `sudo stupid-apps sync` uppdaterar direkt.

Repot behöver vara publikt för att datorerna ska kunna läsa listan. Är det privat använder de listan som följde med installationen, och då dyker nya appar upp först med nästa version av Stupid OS.

## Anpassa

| Vad | Var |
|---|---|
| Namn, version, standardspråk | `config/stupidos.conf` |
| Vilka program som ingår | `config/packages.list` |
| The Stupid Company-appar | `config/stupid-apps.json` |
| Logotyp och bakgrundsbilder | `branding/` |
| GNOME-tillägg för utseendet | `scripts/build-extensions.sh` |
| Skrivbordets standardinställningar | `overlay/usr/share/glib-2.0/schemas/90_stupidos.gschema.override` |
| Installationsprogrammet | `overlay/etc/calamares/` |
| Själva bygget | `build.sh` och `scripts/chroot-setup.sh` |

## Bra att veta

Stupid OS bygger på Ubuntu, men är inte ett officiellt Ubuntu-system och har ingen koppling till Canonical.
