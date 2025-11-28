const mongoose = require('mongoose');

const pageContentSchema = new mongoose.Schema({
  pageId: {
    type: String,
    required: true,
    unique: true,
    enum: ['privacy', 'about', 'terms', 'contact']
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  metaDescription: {
    type: String,
    default: ''
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

pageContentSchema.statics.getPageContent = async function(pageId) {
  let page = await this.findOne({ pageId });
  if (!page) {
    const defaultContent = getDefaultContent(pageId);
    page = await this.create(defaultContent);
  }
  return page;
};

pageContentSchema.statics.updatePageContent = async function(pageId, updates, userId) {
  let page = await this.findOne({ pageId });
  if (!page) {
    const defaultContent = getDefaultContent(pageId);
    page = await this.create({ ...defaultContent, ...updates, updatedBy: userId });
  } else {
    Object.assign(page, updates);
    page.updatedAt = Date.now();
    page.updatedBy = userId;
    await page.save();
  }
  return page;
};

function getDefaultContent(pageId) {
  const defaults = {
    privacy: {
      pageId: 'privacy',
      title: 'Datenschutzerklärung',
      content: `
# Datenschutzerklärung

## 1. Datenschutz auf einen Blick

### Allgemeine Hinweise
Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen.

### Datenerfassung auf dieser Website
Wir erfassen und verarbeiten Ihre Daten nur, soweit dies zur Bereitstellung unserer Dienste erforderlich ist.

## 2. Allgemeine Hinweise und Pflichtinformationen

### Verantwortliche Stelle
Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist der Betreiber dieser Plattform.

### Datenübermittlung
Ihre Daten werden verschlüsselt übertragen und sicher gespeichert.

## 3. Datenerfassung auf dieser Website

### Cookies
Unsere Website verwendet Cookies für die Funktionalität.

### Server-Log-Dateien
Der Provider der Seiten erhebt und speichert automatisch Informationen in Server-Log-Dateien.

## 4. Ihre Rechte
Sie haben jederzeit das Recht auf Auskunft, Berichtigung, Löschung oder Einschränkung der Verarbeitung Ihrer gespeicherten Daten.
      `,
      metaDescription: 'Datenschutzerklärung - Erfahren Sie, wie wir Ihre Daten schützen'
    },
    about: {
      pageId: 'about',
      title: 'Über uns',
      content: `
# Über uns

## Willkommen bei PapaGeil - Deutsch Lernen

Wir sind eine Plattform zum interaktiven Deutschlernen.

## Unsere Mission
Unser Ziel ist es, Deutschlernen einfach, effektiv und unterhaltsam zu gestalten.

## Unsere Methode
- Interaktive Lektionen
- Praktische Übungen
- Shadowing-Technik
- Diktate zur Verbesserung der Rechtschreibung

## Unser Team
Wir sind ein engagiertes Team von Sprachexperten und Entwicklern.

## Kontaktieren Sie uns
Haben Sie Fragen oder Anregungen? Kontaktieren Sie uns gerne!
      `,
      metaDescription: 'Über uns - Lernen Sie mehr über unsere Mission und unser Team'
    },
    terms: {
      pageId: 'terms',
      title: 'Nutzungsbedingungen',
      content: `
# Nutzungsbedingungen

## 1. Geltungsbereich
Diese Nutzungsbedingungen gelten für die Nutzung dieser Website.

## 2. Leistungen
Wir bieten eine Plattform zum Deutschlernen mit verschiedenen interaktiven Funktionen.

## 3. Nutzerkonto
- Sie können ein Konto erstellen, um alle Funktionen zu nutzen
- Sie sind für die Sicherheit Ihres Kontos verantwortlich
- Sie dürfen Ihr Konto nicht an Dritte weitergeben

## 4. Nutzungsrechte
Die Inhalte auf dieser Website sind urheberrechtlich geschützt.

## 5. Haftungsausschluss
Wir übernehmen keine Gewähr für die Richtigkeit und Vollständigkeit der Inhalte.

## 6. Änderungen
Wir behalten uns das Recht vor, diese Nutzungsbedingungen jederzeit zu ändern.

## 7. Kontakt
Bei Fragen zu diesen Nutzungsbedingungen kontaktieren Sie uns bitte.
      `,
      metaDescription: 'Nutzungsbedingungen - Wichtige Informationen zur Nutzung unserer Plattform'
    },
    contact: {
      pageId: 'contact',
      title: 'Kontakt',
      content: `
# Kontakt

## Wir freuen uns von Ihnen zu hören!

Haben Sie Fragen, Anregungen oder benötigen Sie Unterstützung? Kontaktieren Sie uns gerne.

## E-Mail
support@papageil.com

## Adresse
[Ihre Adresse hier einfügen]

## Öffnungszeiten
Montag - Freitag: 9:00 - 18:00 Uhr

## Soziale Medien
Folgen Sie uns auf unseren sozialen Kanälen:
- Facebook
- Instagram
- Twitter

Wir bemühen uns, alle Anfragen innerhalb von 24 Stunden zu beantworten.
      `,
      metaDescription: 'Kontakt - Nehmen Sie Kontakt mit uns auf'
    }
  };
  
  return defaults[pageId] || {
    pageId,
    title: pageId.charAt(0).toUpperCase() + pageId.slice(1),
    content: `# ${pageId}\n\nInhalt wird bald hinzugefügt.`,
    metaDescription: ''
  };
}

module.exports = mongoose.models.PageContent || mongoose.model('PageContent', pageContentSchema);
