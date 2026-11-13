// The "?" explanations and the guide's cards, in German: the same keys as ../en/help.js, with the
// same markup. Amounts are in no currency in particular.

export default {
  // ---- concepts (guide only) ---------------------------------------------------------------------
  "concept.todays-money": {
    title: "Alles in heutiger Kaufkraft",
    html: `<p>Alle Beträge bedeuten <b>heutige Kaufkraft</b>, in jedem Jahr. Der Simulator zieht die
      Inflation von den Renditen ab, statt sie auf die Preise aufzuschlagen.</p>
      <p class="ex">Im Jahr 2050 kaufen 40 000 pro Jahr, was 40 000 heute kaufen, auch wenn auf den
      Rechnungen von 2050 größere Zahlen stehen.</p>
      <p>Gib Ausgaben, Sparraten und Renten also zu heutigen Preisen ein. Renditen und Zinsen gibst
      du wie üblich ein (nominal); der Simulator zieht die eingestellte Inflation ab.</p>`,
  },
  "concept.monte-carlo": {
    title: "Was ein simulierter Verlauf ist",
    html: `<p>Der Simulator spielt deinen Plan in Tausenden möglicher Marktverläufe durch, mit einer
      zufälligen Rendite für jedes Jahr. „Geld reicht in 85 %“ heißt: In 85 von 100 dieser Verläufe
      hat das Geld die Ausgaben jedes Jahres bis zum Ende des Plans bezahlt.</p>
      <p>Das ist keine Prognose für eine Zukunft, sondern ein Maß dafür, wie robust der Plan über
      viele hinweg ist.</p>`,
  },
  "concept.sequence": {
    title: "Warum die ersten Jahre am meisten zählen",
    html: `<p>Ein Crash gleich nach dem Ausstieg richtet weit mehr Schaden an als derselbe Crash
      20 Jahre später: Du verkaufst zu niedrigen Kursen, um die Rechnungen zu bezahlen, und dieses
      Geld erholt sich nie mehr. Das nennt man <b>Sequenzrisiko</b> (Sequence-of-Returns-Risiko).
      Der Stresstest zeigt es.</p>`,
  },
  "concept.swr": {
    title: "Sichere Entnahmerate (SWR)",
    html: `<p>Der Anteil deines Vermögens, den du im ersten Jahr entnehmen und danach jedes Jahr als
      denselben realen Betrag weiter ausgeben kannst, ohne dass das Geld ausgeht. Die bekannte
      „4-Prozent-Regel“ stammt aus 30-jährigen Ruhestandsphasen in den USA; für 40 Jahre und mehr
      oder für Märkte weltweit finden Studien der Vergangenheit etwa 3–3,5 %.</p>
      <p>Mit seinen voreingestellten Renditen findet der Simulator weniger: etwa 3 % über 30 Jahre
      und 2–2,5 % über 45, in 90 % der Verläufe. Seine Renditen liegen unter denen des letzten
      Jahrhunderts, und jedes Jahr wird für sich gezogen, sodass nichts ein schlechtes Jahrzehnt
      zum Durchschnitt zurückholt. „Sichere Ausgaben nach FIRE-Start“ zeigt die Entnahmerate für
      deinen Plan.</p>
      <p class="ex">1 200 000 × 3 % = 36 000 pro Jahr.</p>`,
  },
  "concept.privacy": {
    title: "Deine Zahlen bleiben bei dir",
    html: `<p>Alles läuft in deinem Browser: die Simulation, die Grafiken, das Speichern. Nichts, was
      du eingibst, wird irgendwohin gesendet; es gibt keine Konten und kein Tracking.</p>
      <ul>
        <li>Pläne werden in <b>diesem Browser</b> gespeichert (in seinem lokalen Speicher). Wer die
          Daten der Website löscht, ein privates Fenster nutzt oder Safari Websites aufräumen lässt,
          die man länger nicht besucht hat, verliert sie: Mit <b>Pläne exportieren</b> behältst du
          eine Kopie.</li>
        <li>Um Pläne auf ein anderes Gerät zu bringen, exportiere sie und importiere die Datei
          dort.</li>
        <li>Ein <b>Link zum Teilen</b> trägt einen Plan im Link selbst, nach dem „#“: Diesen Teil
          senden Browser nie an die Website. Wer den Link bekommt, sieht die Zahlen.</li>
        <li>Du musst das nicht einfach glauben: Der Code ist öffentlich, jeder kann prüfen, dass
          nichts gesendet wird, <a href="https://github.com/gabriardi/fire-simulator" target="_blank" rel="noopener">auf GitHub</a>.</li>
      </ul>
      <p>Die <a href="privacy" target="_blank" rel="noopener">Datenschutzerklärung</a> sagt, wer
      diese Website betreibt, was ihr Hoster erhält und wie man ihn erreicht.</p>`,
  },
  "concept.about": {
    title: "Kostenlos und Open Source",
    html: `<p>Keine Werbung, keine Konten, kein Tracking. Der Code ist öffentlich,
      <a href="https://github.com/gabriardi/fire-simulator" target="_blank" rel="noopener">auf GitHub</a>,
      unter der MIT-Lizenz.</p>
      <ul>
        <li>Etwas kaputt, oder eine Zahl, die falsch aussieht?
          <a href="https://github.com/gabriardi/fire-simulator/issues/new/choose" target="_blank" rel="noopener">Eröffne ein Issue</a>,
          mit erfundenen Zahlen: Issues sind öffentlich.</li>
        <li>Kein GitHub-Konto, oder lieber nicht öffentlich? Schreib an
          <a href="mailto:hello@whencanistop.fyi">hello@whencanistop.fyi</a>.</li>
        <li>Wenn es dir nützt, kannst du es unterstützen:
          <a class="coffee" href="https://buymeacoffee.com/gabriardif" target="_blank" rel="noopener"><span aria-hidden="true">☕</span> Spendier mir einen Kaffee</a></li>
      </ul>`,
  },

  // ---- plans ---------------------------------------------------------------------------------------
  plans: {
    title: "Pläne",
    html: `<p>Ein Plan ist deine Situation mit den Entscheidungen, die du ausprobierst, gespeichert
      unter einem Namen in diesem Browser. Lege mehrere zum Vergleichen an: „Mit 50 aufhören“,
      „Mit 55, Teilzeit“, „Weniger ausgeben“.</p>
      <ul>
        <li><b>Wähle</b> einen in der Liste, um ihn zu laden.</li>
        <li><b>Ändere</b> einen beliebigen Wert: Der Plan wird als <b>geändert</b> angezeigt, und ein
          Punkt markiert jedes geänderte Feld. <b>Speichern</b> (oder ⌘S / Strg+S) übernimmt die
          Änderungen; <b>Zurücksetzen</b> holt die gespeicherten Werte zurück. Ungespeicherte
          Änderungen überstehen ein Neuladen.</li>
        <li>Unter <b>⋯</b>: ein neuer Plan von Grund auf, eine Kopie dieses Plans, umbenennen,
          löschen, teilen, exportieren und importieren.</li>
        <li>Nach dem Löschen, Zurücksetzen oder dem Wechsel weg von ungespeicherten Änderungen gibt
          es ein paar Sekunden lang <b>Rückgängig</b>.</li>
      </ul>
      <p>Seed und Anzahl der Verläufe gehören nicht zum Plan: Beim Wechsel bleiben die Verläufe
      dieselben, so ist der Vergleich fair.</p>`,
  },
  backup: {
    title: "Sicherungen",
    html: `<p>Gespeicherte Pläne liegen im Speicher dieses Browsers, nur auf diesem Gerät. Browser
      können ihn leeren:</p>
      <ul>
        <li>beim Löschen der Browserdaten oder der Daten der Website;</li>
        <li>in einem privaten Fenster, wenn es geschlossen wird;</li>
        <li><b>Safari</b> (auf Mac, iPhone oder iPad) löscht die Daten einer Website, wenn du ihn
          7 Tage lang benutzt hast, ohne die Website zu besuchen, außer du hast sie zum
          Home-Bildschirm hinzugefügt;</li>
        <li>manche Browser geben Speicher frei, wenn das Gerät knapp wird.</li>
      </ul>
      <p>Beim ersten Speichern bittet die Seite den Browser, ihren Speicher dauerhaft zu behalten
      (Firefox fragt dich; Chrome und Edge entscheiden selbst). Das schützt vor dem letzten Fall,
      nicht vor den anderen.</p>
      <p><b>Pläne exportieren</b> schreibt alle Pläne in eine Datei: die einzige Sicherung, die einen
      geleerten Browser oder ein verlorenes Gerät übersteht. Ein Hinweis unter dem Plan erinnert
      dich, wenn gespeicherte Änderungen noch in keiner exportierten Datei sind. Zum
      Wiederherstellen: <b>Pläne importieren</b>.</p>`,
  },
  share: {
    title: "Link zum Teilen",
    html: `<p>Ein Link, der eine Kopie dieses Plans im Browser von jemand anderem öffnet (oder in
      deinem, auf einem anderen Gerät). Der Plan steckt im Link selbst, nach dem „#“, den Browser
      nie an die Website senden: Nichts wird hochgeladen. Wer ihn öffnet, bekommt eine eigene
      Kopie; Änderungen auf einer Seite erreichen die andere nicht. Wird derselbe Link noch einmal
      geöffnet, öffnet sich diese Kopie, statt dass eine weitere dazukommt.</p>
      <p>Der Link sagt auch, mit welchem Seed und wie vielen Verläufen du gerechnet hast. Sind es
      beim Gegenüber andere, sagt ein Hinweis unter dem Plan das, denn die Zahlen können dann
      leicht abweichen, und bietet an, dieselben zu verwenden.</p>
      <p>Wer den Link hat, sieht jede Zahl im Plan, außer du gibst ihm ein <b>Passwort</b>: Plan
      und Name werden dann in deinem Browser verschlüsselt, und der Link öffnet sich nur mit diesem
      Passwort. Das Passwort steht nicht im Link, also schicke es auf anderem Weg, nicht in
      derselben Nachricht.</p>
      <p>Wer einen geschützten Link hat, kann auf dem eigenen Computer beliebig viele Passwörter
      ausprobieren, also wähle ein langes: Ein paar Wörter, die nichts miteinander zu tun haben,
      sind besser als ein kurzes Wort mit Sonderzeichen. Ein vergessenes Passwort lässt sich nicht
      wiederherstellen: Teile den Plan dann noch einmal mit einem neuen.</p>
      <p class="ex"><code>Ahorn Tunnel violett sieben</code> → gut. <code>Fire2026!</code> → schnell
      erraten.</p>`,
  },
  files: {
    title: "Exportieren und importieren",
    html: `<p><b>Pläne exportieren</b> lädt alle gespeicherten Pläne als eine Datei herunter: deine
      Sicherung, und der Weg, sie in einen anderen Browser oder auf ein anderes Gerät zu bringen.
      <b>Pläne importieren</b> fügt die Pläne aus einer solchen Datei zu den vorhandenen hinzu
      (nichts wird ersetzt).</p>`,
  },

  // ---- plan ----------------------------------------------------------------------------------------
  fire_year: {
    title: "FIRE-Start",
    html: `<p>Das erste Jahr, in dem du von deinen Ersparnissen lebst: <b>FIRE</b> steht für
      Financial Independence, Retire Early, also finanzielle Unabhängigkeit und früher Ruhestand.
      Bis dahin verdienst und sparst du weiter; ab dann endet das Sparen, und die Entnahmen
      beginnen.</p>
      <p class="ex">Jedes spätere Jahr bringt ein Jahr mehr Sparen und Wachstum und ist ein Jahr
      weniger zu finanzieren. Das Raster weiter unten zeigt die benachbarten Jahre
      nebeneinander.</p>`,
  },
  spending: {
    title: "Ausgaben pro Jahr",
    html: `<p>Was der Haushalt nach dem Ausstieg jedes Jahr ausgeben wird, in heutiger Kaufkraft,
      <b>inklusive</b> der Steuern dieser Jahre (Einkommensteuer auf Entnahmen, Krankenversicherung,
      die du nun selbst zahlst, außer du gibst ihr unten einen eigenen Posten). Lass Kosten weg, die mit der Arbeit enden,
      etwa den Arbeitsweg.</p>
      <p class="ex">40 000 pro Jahr = 3333 pro Monat. Bei einer flexiblen Regel ist das der
      <b>anfängliche</b> Betrag. Der Kapitalverzehr berechnet seinen eigenen und verwendet ihn
      nicht.</p>
      <p>Kosten, die kommen und gehen (eine Hypothek, bis sie abbezahlt ist, die Schule der
      Kinder), passen besser als Posten unter „Einnahmen und Kosten nach dem Ausstieg“, ebenso
      Kosten, die schneller steigen als die Inflation, etwa die Krankenversicherung. Was du als
      Posten eingibst, lässt du bei den Ausgaben weg, sonst zählt es doppelt.</p>
      <p>Eine Steuer auf das Vermögen (eine Vermögensteuer, eine jährliche Stempelsteuer auf
      Wertpapiere) schrumpft mit dem Depot: Zieh ihren Satz stattdessen von der Aktien- und der
      Anleihenrendite ab.</p>
      <p class="ex">0,3 % Vermögensteuer: Aktien 6 % → 5,7 %, Anleihen 3 % → 2,7 %.</p>`,
  },
  end_person: {
    title: "Wie lange das Geld reichen muss",
    html: `<p>Wie lange der Plan aufgehen muss: bis diese Person dieses Alter erreicht. Wähle die
      jüngste Person und ein Alter, das sie kaum überschreiten wird: Längere Zeiträume verlangen
      eine niedrigere Entnahmerate.</p>
      <p>Bei einem Paar ist die Chance, dass mindestens eine Person von euch über 90 wird, viel höher
      als für jede allein: Plane für die langlebigere von euch.</p>`,
  },

  // ---- spending rules ------------------------------------------------------------------------------
  "rule.fixed": {
    title: "Konstante Entnahme",
    html: `<p>Jedes Jahr derselbe reale Betrag, egal, was die Märkte tun. Einfach und planbar, aber
      sie muss die schlimmsten Jahrzehnte unverändert überstehen, daher ist sie der strengste Test:
      die klassische „sichere Entnahmerate“.</p>`,
  },
  "rule.guardrails": {
    title: "Guardrails (Guyton & Klinger)",
    html: `<p>Deine <b>Entnahmerate</b> (was das Depot bezahlt ÷ Vermögen) zu Beginn ist der
      Bezugspunkt. Jedes Jahr gilt:</p>
      <ul><li>Rate um mehr als das <b>Toleranzband</b> über dem Anfangswert (das Vermögen ist
      gefallen) → die Ausgaben werden um den Prozentsatz unter <b>Kürzung / Erhöhung um</b>
      gekürzt;</li>
      <li>Rate um mehr als das Toleranzband unter dem Anfangswert (das Vermögen ist gewachsen) → die
      Ausgaben werden um ihn erhöht;</li>
      <li>sonst unverändert. Immer zwischen Unter- und Obergrenze.</li></ul>
      <p class="ex">1 200 000 und 42 000 → Rate 3,5 %. Mit 20 % Toleranzband und 10 % Kürzung /
      Erhöhung: Unter etwa 1 000 000 (Rate 4,2 %) werden die Ausgaben auf 37 800 gekürzt, über
      1 500 000 (Rate 2,8 %) steigen sie auf 46 200. In einer langen schlechten Phase können sich
      Kürzungen wiederholen.</p>`,
  },
  "rule.vanguard": {
    title: "Vanguard dynamische Entnahme",
    html: `<p>Jedes Jahr ist das <b>Ziel</b> deine anfängliche Entnahmerate × das aktuelle Vermögen
      (plus Einnahmen). Die Ausgaben bewegen sich darauf zu, aber höchstens um die <b>max.
      Erhöhung</b> oder die <b>max. Kürzung</b> pro Jahr. Immer zwischen Unter- und
      Obergrenze.</p>
      <p class="ex">Märkte −30 % → das Ziel sinkt um 30 %, aber die Ausgaben fallen nur um 2,5 % pro
      Jahr, solange es niedrig bleibt. Glatter als Guardrails, langsamer bei einem tiefen Crash.</p>`,
  },
  "rule.spenddown": {
    title: "Kapitalverzehr (Die with Zero)",
    html: `<p>Jedes Jahr berechnet er, was du <b>jedes Jahr bis zum Ende</b> ausgeben könntest,
      immer gleich viel, wenn das Geld die <b>angenommene Rendite</b> erzielte, und zielt
      darauf. Gezählt als Geld von heute: was verfügbar ist, die noch nicht verfügbaren
      Vorsorgekonten (nach ihrer Steuer) und alle künftigen Einnahmen und Kosten. Bis ein Konto
      verfügbar wird, bezahlt nur das verfügbare Geld die Rechnungen, also ist der Betrag nie
      höher, als dieses Geld allein bis dahin tragen kann.</p>
      <p>Jedes Jahr wird der Betrag aus den tatsächlichen Kontoständen neu berechnet. Die Ausgaben
      springen nicht dorthin: Sie bewegen sich um höchstens +Erhöhung / −Kürzung pro Jahr darauf
      zu, immer zwischen Unter- und Obergrenze. Die Ausgaben pro Jahr oben werden nicht
      verwendet.</p>
      <p>Er plant nicht, Geld zu behalten, also gibt er mehr aus und hinterlässt weniger. Ein Crash
      gleich nach dem Ausstieg trifft ihn stärker, weil er in den ersten Jahren mehr ausgibt.</p>
      <p><b>Wenn du schon aufgehört hast</b>, liefert er den Betrag für das Jahr: Gib die
      Kontostände vom Januar ein, setze den FIRE-Start auf dieses Jahr und lies „Ausgaben im ersten
      Jahr“ ab.</p>`,
  },
  "rule.floor": {
    title: "Untergrenze",
    html: `<p>Die niedrigsten Ausgaben, die du akzeptieren würdest: die Kosten, die du nicht senken
      kannst (Wohnen, Gesundheit, Essen, Steuern). Eine flexible Regel geht nie darunter, und ein
      Verlauf <b>scheitert</b> erst, wenn nicht einmal die Untergrenze bezahlt werden kann.</p>
      <p class="ex">32 000 bei einem Plan mit 40 000: das Nötigste, ohne Reisen und Extras.</p>`,
  },
  "rule.ceiling": {
    title: "Obergrenze",
    html: `<p>Der höchste Betrag, den du in guten Zeiten ausgeben möchtest. Ohne sie könnte eine flexible
      Regel die Ausgaben in sehr guten Verläufen immer weiter erhöhen.</p>
      <p>Guardrails und Vanguard beginnen bei deinen Ausgaben, also müssen diese zwischen Unter- und
      Obergrenze liegen. Solange du die Grenzen nicht selbst setzt, liegen sie um die Ausgaben
      herum (−20 %, +25 %) und bewegen sich mit ihnen. Sobald du sie setzt, bleiben sie, und der
      Schieberegler der Ausgaben bleibt innerhalb.</p>`,
  },
  "rule.band": {
    title: "Toleranzband",
    html: `<p>Wie weit sich die Entnahmerate von ihrem Anfangswert entfernen darf, bevor sich die
      Ausgaben ändern. Kleiner = häufigere Anpassungen.</p>
      <p class="ex">20 % → bei 3,5 % zu Beginn passiert zwischen 2,8 % und 4,2 % nichts.</p>`,
  },
  "rule.adjust": {
    title: "Kürzung / Erhöhung um",
    html: `<p>Wie stark sich die Ausgaben ändern, wenn eine Guardrail überschritten wird.</p>
      <p class="ex">10 % → aus 42 000 werden 37 800 nach einer Kürzung, 46 200 nach einer
      Erhöhung.</p>`,
  },
  "rule.up": {
    title: "Max. Erhöhung pro Jahr",
    html: `<p>Um wie viel die Ausgaben in einem Jahr höchstens steigen dürfen, egal, wie gut die
      Märkte waren. Vanguard verwendet 5 % nominal, etwa 3 % in heutiger Kaufkraft.</p>`,
  },
  "rule.down": {
    title: "Max. Kürzung pro Jahr",
    html: `<p>Um wie viel die Ausgaben in einem Jahr höchstens fallen dürfen, egal, wie schlecht die
      Märkte waren. Vanguard verwendet 2,5 % nominal.</p>`,
  },
  "rule.assumed_return": {
    title: "Angenommene Rendite (Kapitalverzehr)",
    html: `<p>Die reale jährliche Rendite, mit der der Kapitalverzehr seinen Betrag berechnet.
      Erzielt das Geld genau diese, bleiben die Ausgaben jedes Jahr gleich; ist es mehr, steigen
      sie; ist es weniger, fallen sie. Unter dem Median der Aktien ist sie eine Sicherheitsmarge:
      etwa 2 Prozentpunkte darunter ist ein vernünftiger Anfang.</p>`,
  },
  "rule.max_raise": {
    title: "Max. Erhöhung pro Jahr (Kapitalverzehr)",
    html: `<p>Um wie viel die Ausgaben in einem Jahr höchstens steigen dürfen. Was noch nicht
      ausgegeben ist, bleibt für die folgenden Jahre.</p>`,
  },
  "rule.max_cut": {
    title: "Max. Kürzung pro Jahr (Kapitalverzehr)",
    html: `<p>Um wie viel die Ausgaben in einem Jahr höchstens fallen dürfen. Eine kleinere Grenze
      bedeutet sanftere Kürzungen, aber sie kommen später, also geht das Geld öfter aus. Ohne Grenze
      (100 %) und ohne Untergrenze kann es nie ausgehen: Die Ausgaben fangen dann das ganze Pech
      auf.</p>`,
  },

  // ---- household -----------------------------------------------------------------------------------
  currency: {
    title: "Währung",
    html: `<p>Die Währung aller Beträge des Plans. Sie ändert nur, wie Zahlen angezeigt werden: Es
      wird nichts umgerechnet, und die Annahmen zu den Märkten legst du selbst für sie fest.</p>`,
  },
  people: {
    title: "Personen",
    html: `<p>Alle, deren Alter für den Plan zählt: deren Vorsorgekonten ab einem Alter verfügbar
      werden, deren Rente ab einem Alter beginnt und für die das Geld reichen muss. Bis zu
      vier.</p>
      <p>Nur das Geburtsjahr wird verwendet: Die Simulation rechnet in ganzen Jahren.</p>`,
  },

  // ---- savings and portfolio ----------------------------------------------------------------------
  portfolio: {
    title: "Heute investiert",
    html: `<p>Der heutige Wert der Anlagen, die du jederzeit verkaufen kannst: Depots, Fonds, Aktien.
      Sie wachsen mit der zufälligen Rendite des Mix aus Aktien und Anleihen unter
      „Depotaufteilung“.</p>
      <p>Vorsorgekonten, an die du erst ab einem bestimmten Alter kommst, gehören stattdessen unter
      „Vorsorgekonten“.</p>`,
  },
  cash: {
    title: "Bankguthaben heute",
    html: `<p>Dein heutiges Guthaben auf Bankkonten. Es wächst mit dem Guthabenzins minus Inflation,
      schrumpft also in heutiger Kaufkraft meist. Ausgaben werden zuerst aus dem Bankguthaben
      bezahlt.</p>`,
  },
  contrib: {
    title: "Sparrate pro Jahr bis zum FIRE-Start",
    html: `<p>Was du bis zum Ausstieg jedes Jahr zu den Anlagen hinzufügst, in heutiger Kaufkraft
      (in Wirklichkeit steigt es also mit der Inflation). Einzahlungen in Vorsorgekonten legst du
      bei jedem Konto fest.</p>`,
  },
  contrib_growth: {
    title: "Sparrate steigt um",
    html: `<p>Wie viel mehr du jedes Jahr sparst, über der Inflation: Lohnerhöhungen und
      Beförderungen. Gilt auch für die Einzahlungen in die Vorsorgekonten.</p>
      <p class="ex">2 % → 20 000 dieses Jahr, 20 400 nächstes Jahr, etwa 26 900 in 15 Jahren.</p>`,
  },
  cash_interest: {
    title: "Guthabenzins",
    html: `<p>Was deine Bankkonten an Zins zahlen, vor der Inflation.</p>
      <p class="ex">1 % bei 2 % Inflation → das Bankguthaben verliert in heutiger Kaufkraft etwa 1 %
      pro Jahr.</p>`,
  },
  cash_buffer_years: {
    title: "Liquiditätsreserve",
    html: `<p>Beim FIRE-Start werden so viele Jahresausgaben aus dem Depot aufs Bankkonto
      umgeschichtet und zuerst ausgegeben, egal, was die Märkte tun. Die Idee: in einem frühen
      Crash nicht verkaufen zu müssen. In diesem Modell hilft sie meist wenig, weil Bankguthaben an
      die Inflation verliert und die Erholung verpasst.</p>`,
  },
  portfolio_tax: {
    title: "Steuer auf Entnahmen aus dem Depot",
    html: `<p>Ein effektiver Steuersatz auf das, was du aus dem Depot entnimmst (nicht aus dem
      Bankguthaben), für Länder, die Kursgewinne oder Dividenden beim Verkauf besteuern. Jede
      Entnahme wird hochgerechnet: Um 100 auszugeben, verkaufst du 100 ÷ (1 − Satz).</p>
      <p class="ex">25 % Steuer auf Gewinne, wenn etwa die Hälfte dessen, was du verkaufst, Gewinn
      ist → etwa 12 %.</p>
      <p>Sind deine Steuern im Ruhestand schon in den Ausgaben enthalten, lass hier 0 stehen.</p>`,
  },

  // ---- retirement accounts -------------------------------------------------------------------------
  accounts: {
    title: "Vorsorgekonten",
    html: `<p>Geld, an das du erst ab einem bestimmten Alter kommst: ein 401(k) oder IRA, eine
      Betriebsrente als Kapitalbezug, eine private Rentenversicherung, eine 2. oder 3. Säule. Bis
      die Person, der es gehört, das Bezugsalter erreicht, zählt es zum Vermögen, kann aber
      <b>keine Rechnungen bezahlen</b>; dann wird es bezogen, versteuert und dem Depot
      zugeschlagen.</p>
      <p>Renten, die lebenslang monatlich ausbezahlt werden, gehören unter „Einnahmen und Kosten
      nach dem Ausstieg“.</p>`,
  },
  "account.contrib": {
    title: "Einzahlung pro Jahr",
    html: `<p>Was bis zum FIRE-Start jedes Jahr auf das Konto fließt (von dir und vom Arbeitgeber),
      in heutiger Kaufkraft.</p>`,
  },
  "account.growth": {
    title: "Wertentwicklung",
    html: `<p><b>Wie das Depot</b>: im selben Mix aus Aktien und Anleihen angelegt, mit denselben
      zufälligen Renditen. <b>Mit festem Zins</b>: jedes Jahr ein gleichbleibender Zins (eine
      Pensionskasse mit garantiertem Zins, ein Sparkonto).</p>`,
  },
  "account.unlock_age": {
    title: "Bezug ab Alter",
    html: `<p>Das Alter der Person, der das Konto gehört, wenn es bezogen und dem Depot zugeschlagen
      wird. Bis dahin scheitert ein Verlauf, in dem das verfügbare Geld ausgeht, auch wenn dieses
      Konto ihn gerettet hätte.</p>
      <p class="ex">Üblich: 59½ in den USA, 57 in Großbritannien (ab 2028), 60 für die Säule 3a in
      der Schweiz und 58–65 für die 2. Säule. Prüfe deine eigenen Regeln.</p>`,
  },
  "account.tax": {
    title: "Steuer beim Bezug",
    html: `<p>Die Steuer auf den Bezug des Geldes, als ein Mischsatz auf den ganzen Kontostand.</p>
      <p class="ex">15 % von 200 000 = 30 000 Steuer, 170 000 ins Depot.</p>`,
  },

  // ---- income and costs ----------------------------------------------------------------------------
  income: {
    title: "Einnahmen und Kosten nach dem Ausstieg",
    html: `<p>Geld, das für eine Zeit des Ruhestands hereinkommt oder zusätzlich zu den Ausgaben
      hinausgeht: eine staatliche Rente, eine monatlich ausbezahlte Betriebsrente, Teilzeitarbeit,
      Miete aus einer Wohnung; oder eine Hypothek, bis sie abbezahlt ist, Kinder im Studium. In der
      Schweiz zahlt, wer vor 65 aufhört zu arbeiten, weiter AHV-Beiträge, die sich nach dem
      Vermögen richten: Kosten bis 65.</p>
      <ul>
        <li>Ein <b>positiver</b> Betrag ist eine Einnahme, ein <b>negativer</b> zusätzliche Kosten.
          Pro Jahr, in heutiger Kaufkraft.</li>
        <li>Er zählt frühestens ab dem FIRE-Start: Davor stecken deine Einkünfte schon in deiner
          Sparrate.</li>
        <li>Er senkt (oder erhöht), was das Depot jedes Jahr bezahlen muss.</li>
      </ul>`,
  },
  "income.when": {
    title: "Beginnt und endet",
    html: `<p>Wann ein Posten beginnt und wann er endet, auf eine von drei Arten:</p>
      <ul><li><b>Im Jahr</b>: ein Kalenderjahr.</li>
      <li><b>Alter von jemandem</b>: ein Alter, also folgt es dem Geburtsjahr.</li>
      <li><b>FIRE-Start + Jahre</b>: bewegt sich mit dem FIRE-Start, so stimmt „Teilzeit in den
        ersten 5 Jahren“ für jeden FIRE-Start im Raster.</li></ul>
      <p>Ein Posten endet <b>im</b> Jahr seines Endes: Endet er bei „FIRE-Start + 5“, zahlt er
      5 Jahre lang.</p>`,
  },
  "income.indexed": {
    title: "Jedes Jahr",
    html: `<p>Wie sich der Betrag des Postens über die Jahre bewegt:</p>
      <ul>
        <li><b>Steigt mit der Inflation</b>: Er behält seinen Wert in heutiger Kaufkraft, wie die
          meisten staatlichen Renten.</li>
        <li><b>Inflation plus oder minus</b>: Er steigt um das eingestellte Prozent
          schneller oder langsamer als die Inflation, ab dem Jahr nach seinem ersten. Ein negativer
          Wert bleibt hinter der Inflation zurück.</li>
        <li><b>Fester Geldbetrag</b>: jedes Jahr derselbe Geldbetrag, sodass die Inflation seinen
          Wert schmälert, wie bei einer Rente, die nie erhöht wird, oder einer Hypothek mit festem
          Zins. Gib den Betrag so ein, wie er ausbezahlt wird.</li>
      </ul>
      <p class="ex">Eine Rente, die hinter der Inflation zurückbleibt, −1 % pro Jahr: 20 000 sind
      nach 10 Jahren etwa 18 100 in heutiger Kaufkraft wert.</p>
      <p class="ex">Eine Krankenversicherung, die schneller teurer wird als die Inflation: Kosten
      von −6000, +2 % pro Jahr → nach 10 Jahren etwa 7300 pro Jahr. Lass sie dann bei den
      Ausgaben pro Jahr weg, sonst zählt sie doppelt.</p>
      <p>Ein Posten, der schon vor diesem Jahr begonnen hat, ändert sich ab diesem Jahr.</p>`,
  },

  // ---- one-off events ------------------------------------------------------------------------------
  events: {
    title: "Einmalige Ereignisse",
    html: `<p>Ein einzelner Betrag in einem einzelnen Jahr, vor oder nach dem FIRE-Start: eine
      Erbschaft oder der Verkauf eines Hauses (positiv), ein neues Dach, ein Auto, eine Hochzeit,
      Hilfe für ein Kind (negativ). In heutiger Kaufkraft, nach allfälligen Steuern. Kosten, die das
      Geld nicht bezahlen kann, lassen den Verlauf in ihrem Jahr scheitern.</p>
      <p>Willst du Geld hinterlassen, gib den Betrag als Kosten im Jahr ein, in dem der Plan endet:
      Ein Verlauf, der mit weniger endet, scheitert.</p>`,
  },

  // ---- markets -------------------------------------------------------------------------------------
  stock_return: {
    title: "Aktienrendite (nominaler Median)",
    html: `<p>Das typische jährliche Wachstum von Aktien, vor der Inflation. Es ist die
      <b>geometrische</b> Wachstumsrate: Die Hälfte der simulierten Jahre ist besser, die Hälfte
      schlechter, und auf lange Sicht wächst das Vermögen mit dieser Rate (der einfache
      Durchschnitt der Jahre ist höher). Der Simulator zieht die Inflation ab.</p>
      <p class="ex">6 % bei 2 % Inflation ≈ 3,9 % real: etwa in der Mitte der langfristigen
      Prognosen für Aktien weltweit (etwa 3,5–5 % real). Aktien weltweit haben seit 1900 rund 5 %
      real pro Jahr erzielt.</p>
      <p>Eine Rendite aus anderer Quelle ist vielleicht der <b>einfache Durchschnitt</b> der Jahre:
      Für dieselben Aktien liegt er um etwa die Hälfte der quadrierten Volatilität höher.</p>
      <p class="ex">Ein Durchschnitt von 7,4 % bei 17 % Volatilität ≈ 6 % hier.</p>
      <p>Diese eine Eingabe bewegt das Ergebnis mehr als jede andere: Probiere einen vorsichtigen
      Fall aus.</p>`,
  },
  stock_vol: {
    title: "Aktienvolatilität",
    html: `<p>Wie stark Aktienrenditen von Jahr zu Jahr schwanken (ihre Standardabweichung). Höhere
      Volatilität schadet einem Entnahmeplan, selbst bei gleichem Median.</p>
      <p class="ex">17 % (Aktien weltweit) → 2 von 3 Jahren zwischen etwa −11 % und +22 % real.</p>
      <p>Senke sie nicht, um ein ruhigeres Depot abzubilden: Weniger Volatilität gibt es nur mit
      weniger Rendite. Senke stattdessen die Aktienquote, die beides zusammen ändert.</p>`,
  },
  inflation: {
    title: "Inflation",
    html: `<p>Rechnet die nominalen Eingaben (Renditen, Zinsen) in heutige Kaufkraft um. Sie erhöht
      deine Ausgaben nicht: Die sind schon in heutiger Kaufkraft.</p>`,
  },
  _tails: {
    title: "Extremjahre",
    html: `<p>Bei einer Normalverteilung kommt ein Jahr mit −40 % fast nie vor. „Fat Tails“ machen
      extreme Jahre um ein Mehrfaches häufiger (und gewöhnliche Jahre etwas ruhiger), begrenzt auf
      −60 % und +60 % real in einem Jahr. Ein Stresstest, keine Prognose.</p>
      <p>Die Zahl in „(t, 6)“ legt fest, wie ausgeprägt: Es ist eine Student-t-Verteilung mit so
      vielen Freiheitsgraden. Je kleiner sie ist, desto häufiger die Extreme.</p>`,
  },

  // ---- portfolio mix -------------------------------------------------------------------------------
  stock_share: {
    title: "Aktienquote",
    html: `<p>Wie viel des Depots (und der gleich angelegten Vorsorgekonten) in Aktien steckt; der
      Rest steckt in Anleihen. Jedes Jahr wird auf diese Quote zurückgeführt (Rebalancing). Weniger
      Aktien = kleinere Schwankungen, aber langsameres Wachstum, vor und nach dem Ausstieg.</p>`,
  },
  tent_share: {
    title: "Bond Tent",
    html: `<p>Eine niedrigere Aktienquote nur rund um den FIRE-Start, den Moment, in dem ein Crash am
      meisten schadet. Davor und danach gilt wieder die normale Aktienquote.</p>
      <p class="ex">Normal 100 %, 70 % beim Start, 4 Jahre bis dahin, 8 zurück: 92,5 %, 85 %,
      77,5 % in den Jahren davor, 70 % im Jahr des FIRE-Starts, danach 3,75 Prozentpunkte mehr pro
      Jahr.</p>
      <p>Setze sie gleich der Aktienquote, um kein Bond Tent zu haben.</p>`,
  },
  tent_years: {
    title: "Jahre bis dahin, Jahre zurück",
    html: `<p>Wie allmählich die Aktienquote vor dem FIRE-Start auf das Bond Tent sinkt und danach
      wieder steigt, in gleichen Schritten. 0 Jahre davor = der Wechsel passiert beim Start.</p>`,
  },
  bond_return: {
    title: "Anleihenrendite (nominal)",
    html: `<p>Das geometrische jährliche Wachstum des Anleihenteils, vor der Inflation. Was zählt, ist
      die Rendite nach Inflation: Hochwertige Anleihen haben oft etwa 0–2 % real erzielt.</p>`,
  },
  bond_vol: {
    title: "Anleihenvolatilität",
    html: `<p>Wie stark Anleihenrenditen von Jahr zu Jahr schwanken. Breite Fonds mit hochwertigen
      Anleihen: ungefähr 4–7 %.</p>`,
  },
  stock_bond_corr: {
    title: "Korrelation Aktien/Anleihen",
    html: `<p>Ob sich Aktien und Anleihen eher gemeinsam bewegen: −1 entgegengesetzt, 0 unabhängig,
      +1 gemeinsam. Negativ hilft einem Mix (Anleihen steigen, wenn Aktien abstürzen). Sie war
      2000–2020 meist negativ und in Inflationsjahren wie 2022 positiv.</p>`,
  },

  // ---- stress --------------------------------------------------------------------------------------
  _stress: {
    title: "Crash beim FIRE-Start erzwingen",
    html: `<p>Ersetzt die ersten Jahre nach dem FIRE-Start in jedem Verlauf durch einen Crash nach
      historischem Vorbild; die Jahre danach bleiben zufällig. Zeigt, wie der Plan mit dem
      schlimmsten Zeitpunkt für einen Crash zurechtkommt.</p>`,
  },
  "stress-custom": {
    title: "Eigener Crash",
    html: `<p>Reale Renditen in %, eine pro Jahr ab dem FIRE-Start, durch Kommas getrennt. Wo das
      Dezimalzeichen ein Komma ist, setze nach den Kommas zwischen den Jahren ein Leerzeichen:
      <code>-12,5, -20</code>.</p>
      <p class="ex"><code>-30, 10, -15</code> → −30 % im ersten Jahr, +10 % im zweiten, −15 % im
      dritten.</p>`,
  },

  // ---- simulation ----------------------------------------------------------------------------------
  n_sims: {
    title: "Simulierte Verläufe",
    html: `<p>Wie viele Verläufe simuliert werden. Mehr = genauer, aber langsamer.</p>
      <p class="ex">10 000 → „Geld reicht“ ist auf etwa ±1 Prozentpunkt genau, 19-mal von 20;
      50 000 → etwa ±0,4.</p>`,
  },
  seed: {
    title: "Zufalls-Seed",
    html: `<p>Wählt die Menge der zufälligen Verläufe. Derselbe Seed ergibt immer dieselben Verläufe:
      Wenn du den Plan änderst, vergleichst du ihn also mit denselben Märkten. <b>Neuer Seed</b>
      zieht eine andere Menge: Bewegt sich das Ergebnis um mehr als etwa einen Prozentpunkt,
      verwende mehr Verläufe.</p>`,
  },
  start_year: {
    title: "Kontostände vom",
    html: `<p>Jahr und Monat, aus denen deine Kontostände stammen. Dort beginnt die Simulation, und
      nur der Rest dieses Jahres wächst und spart noch. Passe es an, wann immer du die Kontostände
      aktualisierst.</p>`,
  },
  locale: {
    title: "Zahlenformat",
    html: `<p>Wie Zahlen geschrieben und gelesen werden: welches Zeichen die Tausender trennt und
      welches die Dezimalstellen. Standardmäßig das der Sprache deines Browsers. Es ist eine
      Einstellung dieses Browsers, nicht eines Plans.</p>`,
  },

  // ---- results -------------------------------------------------------------------------------------
  "result.success": {
    title: "Geld reicht in …",
    html: `<p>Der Anteil der simulierten Verläufe, in denen die Ausgaben jedes Jahres bis zum Ende
      bezahlt werden konnten. Grün ab 90 %, gelb ab 75 %. Rund 90 % sind ein übliches Ziel für
      einen Plan, den man nicht leicht rückgängig machen kann.</p>
      <p>Vorsicht beim Vergleich der Regeln: Bei <b>konstanter</b> Entnahme heißt es, dass immer der
      volle Betrag bezahlt wurde; bei einer <b>flexiblen</b> Regel nur, dass die Ausgaben nie unter
      die Untergrenze fallen mussten.</p>`,
  },
  "result.start": {
    title: "Vermögen beim FIRE-Start",
    html: `<p>Was du beim Ausstieg hättest: Anlagen, Bankguthaben und die Vorsorgekonten (nach ihrer
      Steuer beim Bezug). Auch das ist unsicher, weil die Jahre bis dahin zufällige Märkte
      haben.</p>`,
  },
  "result.rate": {
    title: "Anfängliche Entnahmerate",
    html: `<p>Die Ausgaben im ersten Jahr ÷ das Medianvermögen beim Start. Vergleichbar mit einer
      SWR, aber auch die Einnahmen und die später verfügbar werdenden Vorsorgekonten helfen.</p>`,
  },
  "result.fail": {
    title: "Geld geht aus",
    html: `<p>Der Anteil der Verläufe, in denen das Geld ausgeht, und <b>nur in diesen Verläufen</b>
      das typische Jahr (Median), in dem es passiert. Der letzte Teil: wie viele davon, bevor das
      letzte Vorsorgekonto verfügbar wird (die „Überbrückung“, die das verfügbare Geld allein
      tragen muss).</p>`,
  },
  "result.end": {
    title: "Vermögen am Ende",
    html: `<p>Das Vermögen, das bleibt, wenn der Plan endet, in heutiger Kaufkraft, über <b>alle</b>
      Verläufe (gescheiterte zählen als 0). Der typische Verlauf endet oft reich: Über viele
      Jahrzehnte wächst auch ein durchschnittlicher Markt stark. Es ist derselbe Plan, dem in den
      schlechten Verläufen das Geld ausgeht; darum erlauben flexible Regeln, in den guten mehr
      auszugeben.</p>`,
  },
  "result.first": {
    title: "Ausgaben im ersten Jahr (Kapitalverzehr)",
    html: `<p>Nur für den Kapitalverzehr: was er für das Jahr des FIRE-Starts berechnet, vor Unter-
      und Obergrenze. Es hängt davon ab, wie die Märkte bis zum Ausstieg laufen. Liegt der
      FIRE-Start im Jahr der Kontostände, ist es eine einzige Zahl, in jedem Verlauf gleich.</p>`,
  },
  "result.flex": {
    title: "Durchschnittliche Ausgaben, knappstes Jahr, Untergrenze erreicht",
    html: `<p>Nur für flexible Regeln, unter den Verläufen, in denen das Geld reicht: die typischen
      Ausgaben über den ganzen Ruhestand, die niedrigsten Ausgaben eines Jahres (in den
      schlechtesten 10 % der Verläufe) und wie viele Verläufe mindestens ein Jahr an der
      Untergrenze verbringen.</p>`,
  },
  "result.compare": {
    title: "Gleicher Plan, andere Regeln",
    html: `<p>Dein Plan mit jeder Entnahmeregel, auf denselben Märkten. Wähle eine, um zu
      wechseln. „k. A.“: Deine Ausgaben liegen außerhalb von Unter- und Obergrenze dieser
      Regel.</p>`,
  },

  // ---- charts --------------------------------------------------------------------------------------
  "chart.paths": {
    title: "Vermögen im Lauf der Zeit",
    html: `<p>Jede dünne Linie ist ein Verlauf: violett = am ärmsten, gelb = am reichsten, <b>rot =
      Geld geht aus</b>. Schwarze Linie: Median; gestrichelt: 10. Perzentil; schattiert: die
      mittleren 50 % und 80 % der Verläufe. Gepunktete Linien markieren den FIRE-Start, verfügbar
      werdende Konten, beginnende Einnahmen und einmalige Ereignisse.</p>
      <p><b>Jahresausgaben</b> = Vermögen ÷ jährliche Ausgaben: 25 heißt 25 Jahre Ausgaben auf der
      Bank.</p>`,
  },
  "chart.spending": {
    title: "Was du ausgeben könntest",
    html: `<p>Für flexible Regeln: Jede Linie sind die jährlichen Ausgaben eines Verlaufs. Die
      schattierte Fläche enthält 80 % der Verläufe, in denen das Geld reicht. Gestrichelt: deine
      anfänglichen Ausgaben (nicht beim Kapitalverzehr, wo jeder Verlauf mit eigenen beginnt);
      gepunktet: Unter- und Obergrenze.</p>`,
  },
  "chart.grid": {
    title: "Wann kannst du aufhören, mit welchen Ausgaben?",
    html: `<p>Jede Zelle: wie oft das Geld reicht, wenn du in diesem Jahr (Zeile) aufhörst und so
      viel ausgibst (Spalte). Die umrandete Zelle ist dein Plan. <b>Wähle eine Zelle</b>, um
      diesen Plan auszuprobieren.</p>
      <p>Bei Guardrails oder Vanguard halten Unter- und Obergrenze, die du selbst gesetzt hast, die
      Spalten zwischen sich. So belassen, wie sie kamen, um die Ausgaben herum, bewegen sie sich
      mit: Jede Spalte hat ihre eigenen, wie wenn du die Ausgaben änderst.</p>
      <p>Beim Kapitalverzehr, der seine Ausgaben selbst berechnet, sind die Spalten seine
      <b>Untergrenze</b>, bis zu seiner Obergrenze.</p>`,
  },
  "chart.safe": {
    title: "Sichere Ausgaben nach FIRE-Start",
    html: `<p>Die höchsten jährlichen Ausgaben, mit denen das Geld in 90 % (durchgezogen) und 95 %
      (gepunktet) der Verläufe reicht, für jeden FIRE-Start. Zeige oder tippe darauf für die
      Entnahmerate, die sich daraus ergibt.</p>
      <p>Beim Kapitalverzehr zeigt sie stattdessen, was er im ersten Jahr erlaubt, wenn du im
      jeweiligen Jahr aufhörst: im Median-Verlauf und in den schlechtesten und besten 10 %, je
      nachdem, wie die Jahre bis dahin liefen.</p>`,
  },
  "chart.stress": {
    title: "Stresstest",
    html: `<p>Dein Plan mit einem Crash, der in die ersten Jahre nach dem FIRE-Start gelegt wird, für
      jede Regel. Zeigt, welche Regel am besten standhält, wenn es im schlimmsten Moment schiefgeht.</p>`,
  },
  "chart.dist": {
    title: "Verteilungen",
    html: `<p>Links: wie sich das Vermögen beim FIRE-Start über die Verläufe verteilt. Rechts: in
      welchen Jahren den scheiternden Verläufen das Geld ausgeht. Balken vor dem Bezug des letzten
      Kontos heißen, dass die Überbrückung zu knapp war.</p>`,
  },
};
