import QtQuick 2.0
import calamares.slideshow 1.0

Presentation {
    id: presentation

    function onActivate() { timer.running = true }
    function onLeave() { timer.running = false }

    Timer {
        id: timer
        interval: 12000
        repeat: true
        onTriggered: presentation.goToNextSlide()
    }

    Rectangle { anchors.fill: parent; color: "#FAF9F5"; z: -1 }

    component Card: Slide {
        property string title
        property string body
        Rectangle { anchors.fill: parent; color: "#FAF9F5" }
        Column {
            anchors.centerIn: parent
            width: parent.width * 0.72
            spacing: 18
            Image { source: "icon.png"; width: 72; height: 72; anchors.horizontalCenter: parent.horizontalCenter; smooth: true }
            Text {
                width: parent.width; horizontalAlignment: Text.AlignHCenter; wrapMode: Text.WordWrap
                text: title; color: "#191919"; font.family: "Inter"; font.pixelSize: 30; font.weight: Font.DemiBold
            }
            Text {
                width: parent.width; horizontalAlignment: Text.AlignHCenter; wrapMode: Text.WordWrap
                text: body; color: "#5E5A52"; font.family: "Inter"; font.pixelSize: 17; lineHeight: 1.3
            }
        }
    }

    Card {
        title: qsTr("Välkommen till SmartOS")
        body: qsTr("Ett lugnt och snabbt operativsystem byggt på Ubuntu 24.04 LTS. Säkerhetsuppdateringar ingår till 2029.")
    }
    Card {
        title: qsTr("Allt du behöver från start")
        body: qsTr("Webbläsare, kontorsprogram, bilder, video, musik och utskrifter fungerar direkt efter installationen.")
    }
    Card {
        title: qsTr("Tusentals appar")
        body: qsTr("Öppna Programvara för att installera Spotify, Slack, Zoom, VS Code, Steam och mycket mer med ett klick.")
    }
    Card {
        title: qsTr("Dina drivrutiner, automatiskt")
        body: qsTr("SmartOS hittar drivrutiner för grafik, wifi och skrivare själv. Grafikkort från NVIDIA hittar du under Programvara och uppdateringar.")
    }
}
