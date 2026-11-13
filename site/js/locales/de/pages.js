// The texts only the pages hold, in German, by the keys the English pages mark them with
// (index.html, privacy.html), with the manifest's and the structured data's. Not loaded by the
// browser: scripts/pages.js puts them into de/index.html, de/privacy.html and
// de/manifest.webmanifest. A text with markup keeps the English's; one in an attribute (a title,
// an aria-label, a meta) writes " < & as &quot; &lt; &amp;.

export default {
  // ---- the name, search results, link previews, the app ------------------------------------------
  "app.name": "When can I stop?",
  "app.shortName": "Can I stop?",
  "meta.title": "When can I stop? · Monte-Carlo-FIRE-Rechner",
  "meta.description":
    "Wann könntest du in Frührente gehen, und wie viel könntest du ausgeben? Ein kostenloser Monte-Carlo-FIRE-Rechner, der in deinem Browser läuft: Nichts, was du eingibst, verlässt dein Gerät.",
  "meta.imageAlt":
    "When can I stop? Ein Monte-Carlo-FIRE-Rechner, neben einem Screenshot: Das Geld reicht in 78 % von 10 000 Verläufen.",
  "meta.alternateName": "When can I stop? Monte-Carlo-FIRE-Rechner",
  "meta.os": "Alle: läuft in einem Webbrowser",
  "meta.requirements": "Erfordert JavaScript",
  "manifest.description":
    "Wann könntest du in Frührente gehen, und wie viel könntest du ausgeben? Ein Monte-Carlo-FIRE-Rechner, in heutiger Kaufkraft, ganz in deinem Browser.",

  // ---- the panel ----------------------------------------------------------------------------------
  "page.parameters": "Parameter",
  "page.loading": "Wird geladen…",
  "page.done": "Fertig",
  "page.plan": "Plan",
  "page.help.plans": "Erklärung: Pläne",
  "page.planActions": "Aktionen für den Plan",
  "page.menu.new": "Neuer Plan…",
  "page.menu.saveAs": "Als Kopie speichern…",
  "page.menu.rename": "Umbenennen…",
  "page.menu.delete": "Löschen",
  "page.menu.share": "Link teilen…",
  "page.menu.export": "Pläne exportieren",
  "page.menu.import": "Pläne importieren…",
  "page.revert": "Zurücksetzen",
  "page.backup.export": "Exportieren",
  "page.help.backup": "Erklärung: Sicherungen",
  "page.shared.use": "Dieselben verwenden",
  "page.shared.dismiss": "Hinweis schließen",
  "page.fab": "Parameter anpassen",

  // ---- the header, the welcome note ---------------------------------------------------------------
  "page.noscript":
    "<b>When can I stop?</b> ist ein Monte-Carlo-FIRE-Rechner, der in deinem Browser läuft, und braucht deshalb JavaScript. Nichts, was du eingibst, wird jemals irgendwohin gesendet.",
  "page.pill": "Der angezeigte Plan",
  "page.sub": "Heutige Kaufkraft · Monte Carlo",
  "page.newSeed.title": "Eine andere Menge zufälliger Verläufe ziehen",
  "page.language": "Sprache",
  "page.language.name": "Deutsch",
  "page.language.code": "DE",
  "page.theme": "Design",
  "page.theme.title": "Hell, dunkel oder wie auf dem Gerät eingestellt",
  "page.theme.auto": "Design: automatisch",
  "page.theme.light": "Design: hell",
  "page.theme.dark": "Design: dunkel",
  "page.welcome.title": "Wann kannst du aufhören zu arbeiten, und wie viel kannst du ausgeben?",
  "page.welcome.text":
    "Der Simulator spielt deinen Plan in Tausenden möglicher Marktverläufe durch und sagt dir, wie oft das Geld reicht. Die Zahlen unten gehören Alex und Sam, einem erfundenen Haushalt, und zeigen, wie es funktioniert. Lege deinen eigenen Plan an, um deine Zahlen zu sehen: Alles, was du eingibst, bleibt in diesem Browser, und nichts wird irgendwohin gesendet.",
  "page.welcome.setup": "Meinen Plan anlegen",
  "page.welcome.import": "Pläne importieren",
  "page.welcome.close": "Weiter erkunden",

  // ---- the results and the charts -----------------------------------------------------------------
  "page.hero.label": "Geld reicht in",
  "page.help.success": "Erklärung: Geld reicht in",
  "page.paths.title": "Vermögen im Lauf der Zeit",
  "page.help.paths": "Erklärung: Vermögen im Lauf der Zeit",
  "page.paths.desc":
    "Jede dünne Linie ist ein simulierter Verlauf, gefärbt vom ärmsten (violett) bis zum reichsten (gelb); bei roten Linien geht das Geld aus. Die schwarze Linie ist der Median, die schattierten Flächen enthalten die mittleren 50 % und 80 % der Verläufe.",
  "page.unit": "Einheit",
  "page.unit.years": "Jahresausgaben",
  "page.unit.money": "Geld",
  "page.spending.title": "Was du ausgeben könntest",
  "page.help.chart": "Erklärung zu dieser Grafik",
  "page.spending.desc":
    "Der Preis der Flexibilität: Jede Linie zeigt die jährlichen Ausgaben eines Verlaufs (rote enden, wenn das Geld ausgeht). Die schattierte Fläche enthält 80 % der Verläufe, in denen das Geld reicht.",
  "page.stress.title": "Stresstest: ein Crash gleich nach dem Ausstieg",
  "page.stress.desc":
    "Ein Crash nach historischem Vorbild in den ersten Jahren nach dem FIRE-Start, danach zufällige Märkte. Ein schlechter Start ist es, was einen Entnahmeplan zerstört: Du verkaufst zu niedrigen Kursen, um die Rechnungen zu bezahlen, und dieses Geld erholt sich nie mehr.",
  "page.dist.start": "Vermögen beim FIRE-Start",
  "page.help.charts": "Erklärung zu diesen Grafiken",
  "page.dist.fail": "Jahr, in dem das Geld ausgeht",

  // ---- how the simulation works ---------------------------------------------------------------------
  "page.how.summary": "Wie die Simulation funktioniert, und was sie nicht sieht",
  "page.how.money": "Alles in heutiger Kaufkraft",
  "page.how.money.text":
    "Die Renditen werden nach Inflation gezogen, Ausgaben von 40 000 pro Jahr bedeuten also in jedem Jahr heutige Kaufkraft. Nominale Eingaben (Renditen, Zinsen) werden mit der eingestellten Inflation umgerechnet.",
  "page.how.years": "Ein Jahr nach dem anderen",
  "page.how.years.portfolio":
    "Das Depot und die gleich angelegten Vorsorgekonten sind ein Mix aus Aktien und Anleihen, der jedes Jahr neu ausgeglichen wird (Rebalancing). Aktien und Anleihen erhalten je eine zufällige Rendite pro Jahr, unabhängig voneinander gezogen aus einer Log-Normalverteilung mit dem eingestellten Median und der eingestellten Streuung (oder aus einer mit Fat Tails).",
  "page.how.years.cash":
    "Bankguthaben und Konten mit festem Zins wachsen mit ihrem Zins minus Inflation. Bis zum FIRE-Start sparst du weiter.",
  "page.how.years.unlock":
    "Erreicht die Person, der es gehört, das Bezugsalter, wird ein Vorsorgekonto bezogen, versteuert und dem Depot zugeschlagen.",
  "page.how.years.income":
    "Ab dem FIRE-Start zählen Einnahmen (Renten, Teilzeitarbeit) und zusätzliche Kosten, jeder Posten auf Wunsch mit einer festen jährlichen Änderung, und einmalige Ereignisse geschehen in ihrem Jahr.",
  "page.how.years.fail":
    "Die Ausgaben kommen zuerst aus dem Bankguthaben, dann aus dem Depot. Ein Verlauf <strong>scheitert</strong> im ersten Jahr, in dem das verfügbare Geld die Rechnungen nicht bezahlen kann, auch wenn später ein Vorsorgekonto verfügbar würde.",
  "page.how.rules": "Entnahmeregeln",
  "page.how.rules.fixed":
    "<strong>Konstant:</strong> jedes Jahr derselbe reale Betrag (die klassische sichere Entnahmerate).",
  "page.how.rules.guardrails":
    "<strong>Guardrails</strong> (Guyton &amp; Klinger): Ausgaben kürzen, wenn die Entnahmerate um mehr als das Toleranzband über ihren Anfangswert steigt, und erhöhen, wenn sie darunter fällt.",
  "page.how.rules.vanguard":
    "<strong>Vanguard dynamisch:</strong> zielt auf einen festen Anteil am Vermögen, ändert die Ausgaben aber um höchstens +Erhöhung / −Kürzung pro Jahr.",
  "page.how.rules.spenddown":
    "<strong>Kapitalverzehr</strong> (Die with Zero): Angestrebt wird jedes Jahr, was bis zum Ende jedes Jahr ausgegeben werden könnte, wenn das Geld die angenommene Rendite erzielte; die noch nicht verfügbaren Konten und künftige Einnahmen zählen dabei als Geld von heute, aber bis ein Konto verfügbar wird, bezahlt nur das verfügbare Geld. Die Ausgaben bewegen sich um höchstens +Erhöhung / −Kürzung pro Jahr darauf zu.",
  "page.how.rules.band":
    "Die flexiblen Regeln bleiben zwischen der Untergrenze (Kosten, die du nicht senken kannst) und der Obergrenze. Sie scheitern nur, wenn nicht einmal die Untergrenze bezahlt werden kann.",
  "page.how.limits": "Was sie nicht sieht",
  "page.how.limits.markets":
    "Echte Märkte haben lange schlechte Phasen und Erholungen; unabhängige zufällige Jahre sind eine Vereinfachung. Für schlechte Starts gibt es den Stresstest.",
  "page.how.limits.returns":
    "Die Annahme zur Rendite bewegt das Ergebnis mehr als alles andere. Probiere einen vorsichtigen Fall aus.",
  "page.how.limits.inflation":
    "Die Inflation ist der eingestellte Satz, in jedem Jahr: Nur die Renditen sind zufällig.",
  "page.how.limits.taxes":
    "Steuern sind vereinfacht: ein fester Satz auf jedes Vorsorgekonto bei seinem Bezug und wahlweise ein effektiver Satz auf Entnahmen aus dem Depot. Einkommensteuer und Krankenversicherung gehören in die Ausgaben; eine Steuer auf das Vermögen ziehst du von den Renditen ab.",
  "page.how.limits.missing":
    "Nicht abgebildet: Rentenreformen, wie lange jede Person lebt (der Plan läuft einfach bis zum eingestellten Alter), Währungsrisiko.",
  "page.how.advice":
    "Dies ist ein Werkzeug, um über einen Plan nachzudenken, keine Finanzberatung.",
  "page.foot.free":
    'Kostenlos, ohne Werbung und ohne Tracking. Wenn es dir nützt: <a class="coffee" href="https://buymeacoffee.com/gabriardif" target="_blank" rel="noopener"><span aria-hidden="true">☕</span> Spendier mir einen Kaffee</a>',
  "page.foot.links":
    'Open Source (<a href="https://github.com/gabriardi/fire-simulator/blob/main/LICENSE" target="_blank" rel="noopener">MIT-Lizenz</a>) · <a href="https://github.com/gabriardi/fire-simulator" target="_blank" rel="noopener">Code und Issues auf GitHub</a> · Feedback: <a href="mailto:hello@whencanistop.fyi">hello@whencanistop.fyi</a> · <a href="privacy">Datenschutz</a>',

  // ---- the dialogs ----------------------------------------------------------------------------------
  "page.help.title": "Hilfe",
  "page.close": "Schließen",
  "page.dismiss": "Schließen",
  "page.name.title": "Plan speichern",
  "page.setup.title": "Plan anlegen",
  "page.setup.text":
    "Das Wesentliche, für eine erste Antwort. Vorsorgekonten, weitere Einnahmen, einmalige Ereignisse und die Annahmen zu den Märkten kannst du danach unter Parameter ergänzen.",
  "page.setup.create": "Plan anlegen",
  "page.share.title": "Diesen Plan teilen",
  "page.share.text":
    "Ein Link, der eine Kopie des angezeigten Plans öffnet, ungespeicherte Änderungen inklusive. Der Plan steckt im Link selbst, nach dem „#“, den Browser nie an die Website senden: Nichts wird hochgeladen. <strong>Wer den Link hat, sieht jede Zahl darin</strong>, außer du schützt ihn mit einem Passwort.",
  "page.share.password": "Passwort (optional)",
  "page.share.link": "Link",
  "page.share.native": "Teilen…",
  "page.share.copy": "Link kopieren",
  "page.unlock.text":
    "Jemand hat einen Plan geteilt, der mit einem Passwort geschützt ist: Frag nach dem Passwort. Er wird als neuer Plan in diesem Browser geöffnet; deine eigenen Pläne bleiben, wie sie sind.",
  "page.unlock.password": "Passwort",

  // ---- the privacy notice -----------------------------------------------------------------------------
  "privacy.title": "Datenschutz · When can I stop?",
  "privacy.description":
    "Was When can I stop? auf deinem Gerät speichert, was sein Hoster erhält, wer es betreibt und wie man ihn erreicht. Kein Konto, keine Cookies, keine Analyse, kein Tracking.",
  "privacy.back": "← When can I stop?",
  "privacy.h1": "Datenschutz",
  "privacy.updated":
    "Zuletzt aktualisiert am 13. November 2026. Maßgeblich ist die englische Fassung.",
  "privacy.summary":
    "<b>Kurz gesagt:</b> Was du in When can I stop? eingibst, bleibt auf deinem Gerät. Es gibt kein Konto, kein Cookie, keine Analyse und kein Tracking, und die Seite lädt nichts von anderen Websites. Die einzigen Daten, die jemanden erreichen, sind die, die jeder Browser zum Abrufen einer Webseite sendet, und sie enthalten nie deine Pläne.",
  "privacy.who": "Wer diese Website betreibt",
  "privacy.who.text":
    'whencanistop.fyi wird von Gabriele Ardizzone in der Schweiz betrieben, als kostenloses, nicht kommerzielles Projekt. Für alles zum Datenschutz schreib an <a href="mailto:privacy@whencanistop.fyi">privacy@whencanistop.fyi</a>, für alles andere an <a href="mailto:hello@whencanistop.fyi">hello@whencanistop.fyi</a>. Wenn du an eine der beiden Adressen schreibst, werden deine Nachricht und deine Adresse im Postfach des Betreibers bei iCloud Mail (Apple) aufbewahrt, nur um dir zu antworten, und gelöscht, sobald sie nicht mehr gebraucht werden.',
  "privacy.device": "Was auf deinem Gerät bleibt",
  "privacy.device.text":
    "Die Simulation läuft in deinem Browser. Die Seite speichert Folgendes im lokalen Speicher des Browsers, nur auf deinem Gerät, und sendet es nie irgendwohin:",
  "privacy.device.storage":
    "deine gespeicherten Pläne und den angezeigten Plan mit seinen ungespeicherten Änderungen;",
  "privacy.device.settings":
    "deine Einstellungen: den Zufalls-Seed, die Anzahl der simulierten Verläufe, das Zahlenformat, die gewählte Sprache und das gewählte Design, welche Bereiche des Formulars offen sind und ob du den Begrüßungshinweis geschlossen hast;",
  "privacy.device.exported":
    "wann du deine Pläne zuletzt exportiert hast, für die Erinnerung an eine Sicherung.",
  "privacy.device.why":
    "Sie sind für das da, worum du die Seite bittest: deine Pläne behalten und dort weitermachen, wo du aufgehört hast. Sie bleiben, bis du sie löschst, auf der Seite oder indem du die Daten dieser Website in den Einstellungen deines Browsers löschst.",
  "privacy.device.offline":
    "Sobald die Website geladen ist, behält ein Service Worker außerdem eine Kopie ihrer eigenen Dateien, damit sie offline funktioniert. Er enthält nichts über dich. Die Website setzt keine Cookies.",
  "privacy.files": "Dateien und Links zum Teilen",
  "privacy.files.text":
    "<b>Pläne exportieren</b> speichert eine Datei auf deinem Gerät. Ein <b>Link zum Teilen</b> trägt einen Plan im Link selbst, nach dem „#“, den Browser nie an einen Server senden: Der Link gelangt nur dorthin, wohin du ihn schickst. Wer ihn hat, kann den Plan öffnen, außer du schützt ihn mit einem Passwort.",
  "privacy.host": "Was der Hoster erhält",
  "privacy.host.text":
    "Die Website wird bei Cloudflare gehostet (Cloudflare, Inc., USA). Wie jeder Webhoster erhält Cloudflare, was dein Browser zum Abrufen jeder Datei sendet: deine IP-Adresse, welche Datei angefragt wurde, wann, und Angaben zum Browser (den User-Agent). Außer beim Öffnen der Seite fragt dein Browser die Dateien der Website von Zeit zu Zeit erneut an, solange sie offen ist, um nach einer neuen Version zu sehen.",
  "privacy.host.cloudflare":
    'Cloudflare nutzt dies, um die Website auszuliefern und vor Angriffen zu schützen, und speichert es in seinen Logs, wie seine <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener">Datenschutzrichtlinie</a> beschreibt.',
  "privacy.host.logs":
    "Für diese Website sind außerdem die Workers Logs von Cloudflare eingeschaltet, um Probleme zu finden. Was sie über eine Anfrage aufzeichnen, wird 3 Tage lang aufbewahrt, kann nur im Cloudflare-Konto der Website gelesen werden und wird für nichts anderes verwendet.",
  "privacy.host.transfers":
    "Cloudflare tut dies im Auftrag des Betreibers, gemäß seinem Auftragsverarbeitungsvertrag (Data Processing Addendum). Cloudflare hat Rechenzentren auf der ganzen Welt und hat seinen Sitz in den USA. Übermittlungen stützen sich auf die Zertifizierung von Cloudflare unter dem EU-U.S. und dem Swiss-U.S. Data Privacy Framework sowie auf die Standardvertragsklauseln der EU in seinem Auftragsverarbeitungsvertrag, die auch durch Schweizer Recht geschützte Daten abdecken.",
  "privacy.host.basis":
    "Für Besucherinnen und Besucher, die durch die DSGVO geschützt sind, ist die Rechtsgrundlage das berechtigte Interesse des Betreibers an einer sicheren, funktionierenden Website (Art. 6 Abs. 1 lit. f DSGVO).",
  "privacy.links": "Links zu anderen Websites",
  "privacy.links.text":
    "Die Seite verlinkt auf GitHub, für den Code, und auf Buy Me a Coffee. Von dort wird nichts geladen, außer du klickst auf einen Link; dort gelten dann deren eigene Datenschutzrichtlinien.",
  "privacy.rights": "Deine Rechte",
  "privacy.rights.text":
    'Du kannst fragen, welche Daten der Betreiber über dich hat, sie berichtigen oder löschen lassen oder ihrer Verwendung widersprechen: Schreib an <a href="mailto:privacy@whencanistop.fyi">privacy@whencanistop.fyi</a>. In der Praxis hat der Betreiber über dich nichts außer den Anfrage-Logs dieser wenigen Tage.',
  "privacy.rights.complain":
    'Du kannst dich auch bei einer Datenschutzbehörde beschweren: in der Schweiz beim <a href="https://www.edoeb.admin.ch/de" target="_blank" rel="noopener">Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB)</a>, in der EU oder im EWR bei der Behörde deines Wohnorts.',
  "privacy.advice": "Keine Beratung, keine Gewährleistung",
  "privacy.advice.text":
    'When can I stop? ist ein Werkzeug, um über einen Plan nachzudenken. Es ist keine Finanzberatung und keine Prognose. Es ist kostenlos und wird bereitgestellt, wie es ist, ohne jede Gewährleistung (<a href="https://github.com/gabriardi/fire-simulator/blob/main/LICENSE" target="_blank" rel="noopener">MIT-Lizenz</a>). Was du mit deinem Geld entscheidest, liegt bei dir.',
  "privacy.changes": "Änderungen",
  "privacy.changes.text":
    'Eine neue Fassung dieser Erklärung wird hier veröffentlicht, mit ihrem Datum. Jede frühere Fassung steht in der <a href="https://github.com/gabriardi/fire-simulator/commits/main/site/de/privacy.html" target="_blank" rel="noopener">Versionsgeschichte des Projekts auf GitHub</a>.',
  "privacy.backLink": "Zurück zu When can I stop?",
};
