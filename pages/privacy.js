import { useState, useEffect } from 'react';
import SEO from '../components/SEO';
import Header from '../components/Header';
import ShareButtons from '../components/ShareButtons';
import styles from '../styles/Terms.module.css';

// Privacy Policy Content - Professional German DSGVO-compliant
const PRIVACY_CONTENT = {
  title: 'Datenschutzerklärung',
  metaDescription: 'Datenschutzerklärung für PapaGeil - Erfahren Sie, wie wir Ihre Daten schützen und verarbeiten gemäß DSGVO.',
  lastUpdated: '23. Januar 2026',
  version: '2.0',
  sections: [
    {
      id: 'verantwortlicher',
      icon: '🏢',
      title: 'Verantwortlicher',
      content: [
        'Verantwortlich für die Datenverarbeitung auf dieser Website ist:',
        '**PAPAGEIL CO., LTD.**',
        'E-Mail: support@papageil.me',
        'Website: https://papageil.net',
        'Der Verantwortliche entscheidet allein oder gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von personenbezogenen Daten.'
      ]
    },
    {
      id: 'datenerhebung',
      icon: '📊',
      title: 'Erhebung und Speicherung personenbezogener Daten',
      content: [
        '**2.1 Bei Besuch der Website**',
        'Beim Aufrufen unserer Website werden automatisch folgende Informationen erhoben:',
        '- IP-Adresse des anfragenden Rechners (anonymisiert)',
        '- Datum und Uhrzeit des Zugriffs',
        '- Name und URL der abgerufenen Datei',
        '- Zuvor besuchte Website (Referrer-URL)',
        '- Verwendeter Browser und Betriebssystem',
        '**2.2 Bei Registrierung**',
        'Bei der Erstellung eines Kontos erheben wir:',
        '- E-Mail-Adresse',
        '- Benutzername (optional)',
        '- Passwort (verschlüsselt gespeichert)',
        '**2.3 Bei Nutzung der Lernfunktionen**',
        'Während der Nutzung unserer Plattform erfassen wir:',
        '- Lernfortschritt und Statistiken',
        '- Gespeicherte Vokabeln',
        '- Absolvierte Lektionen und erreichte Punkte'
      ]
    },
    {
      id: 'rechtsgrundlage',
      icon: '⚖️',
      title: 'Rechtsgrundlage der Datenverarbeitung',
      content: [
        'Die Verarbeitung Ihrer personenbezogenen Daten erfolgt auf Basis folgender Rechtsgrundlagen gemäß DSGVO:',
        '- **Art. 6 Abs. 1 lit. a DSGVO**: Einwilligung (z.B. Newsletter)',
        '- **Art. 6 Abs. 1 lit. b DSGVO**: Vertragserfüllung (z.B. Bereitstellung des Dienstes)',
        '- **Art. 6 Abs. 1 lit. f DSGVO**: Berechtigtes Interesse (z.B. Website-Sicherheit, Analyse)',
        'Soweit wir für Verarbeitungsvorgänge Ihre Einwilligung einholen, ist Art. 6 Abs. 1 lit. a DSGVO Rechtsgrundlage. Sie können Ihre Einwilligung jederzeit widerrufen.'
      ]
    },
    {
      id: 'zweck',
      icon: '🎯',
      title: 'Zweck der Datenverarbeitung',
      content: [
        'Wir verarbeiten Ihre Daten für folgende Zwecke:',
        '- Bereitstellung und Verbesserung unserer Lernplattform',
        '- Personalisierung des Lernerlebnisses',
        '- Speicherung Ihres Lernfortschritts',
        '- Kommunikation mit Ihnen (Support-Anfragen)',
        '- Sicherheit und Schutz vor Missbrauch',
        '- Statistische Auswertung zur Verbesserung unseres Angebots',
        '- Erfüllung gesetzlicher Aufbewahrungspflichten'
      ]
    },
    {
      id: 'speicherdauer',
      icon: '⏱️',
      title: 'Speicherdauer',
      content: [
        'Ihre personenbezogenen Daten werden nur so lange gespeichert, wie es für die Erfüllung der genannten Zwecke erforderlich ist oder Sie einer darüber hinausgehenden Speicherung zugestimmt haben.',
        '**Kontodaten**: Werden gespeichert, solange Ihr Konto aktiv ist, plus 30 Tage nach Löschung.',
        '**Lernfortschritt**: Wird mit dem Konto verknüpft und bei Kontolöschung entfernt.',
        '**Server-Logs**: Werden nach 14 Tagen automatisch gelöscht.',
        '**Cookies**: Siehe Abschnitt "Cookies und Tracking".'
      ]
    },
    {
      id: 'empfaenger',
      icon: '🔗',
      title: 'Weitergabe von Daten',
      content: [
        'Eine Übermittlung Ihrer Daten an Dritte findet nur statt, wenn:',
        '- Sie ausdrücklich eingewilligt haben (Art. 6 Abs. 1 lit. a DSGVO)',
        '- dies für die Vertragserfüllung erforderlich ist (Art. 6 Abs. 1 lit. b DSGVO)',
        '- eine gesetzliche Verpflichtung besteht (Art. 6 Abs. 1 lit. c DSGVO)',
        '**Auftragsverarbeiter**, die wir einsetzen:',
        '- Hosting-Anbieter (Server in der EU)',
        '- YouTube API Services (für eingebettete Videos)',
        '- Authentifizierungsdienste (Google, falls verwendet)'
      ]
    },
    {
      id: 'youtube',
      icon: '▶️',
      title: 'YouTube API Services',
      content: [
        'Unsere Plattform nutzt die YouTube API Services zur Einbettung von Videos. Durch die Nutzung akzeptieren Sie:',
        '- Die YouTube Terms of Service: https://www.youtube.com/t/terms',
        '- Die Google Privacy Policy: https://policies.google.com/privacy',
        'YouTube kann dabei Daten über Ihr Nutzungsverhalten erfassen. Wir haben keinen Einfluss auf Art und Umfang der durch YouTube verarbeiteten Daten.'
      ]
    },
    {
      id: 'cookies',
      icon: '🍪',
      title: 'Cookies und Tracking',
      content: [
        '**8.1 Was sind Cookies?**',
        'Cookies sind kleine Textdateien, die auf Ihrem Gerät gespeichert werden und der Wiedererkennung dienen.',
        '**8.2 Arten von Cookies**',
        '- **Notwendige Cookies**: Für die Grundfunktionen der Website (z.B. Anmeldung)',
        '- **Funktionale Cookies**: Speichern Ihre Einstellungen (z.B. Sprache)',
        '- **Analyse-Cookies**: Helfen uns, die Nutzung zu verstehen (optional)',
        '**8.3 Cookie-Einstellungen**',
        'Sie können Cookies in Ihren Browsereinstellungen verwalten oder blockieren. Beachten Sie, dass einige Funktionen der Website möglicherweise nicht verfügbar sind, wenn Sie Cookies deaktivieren.'
      ]
    },
    {
      id: 'rechte',
      icon: '✊',
      title: 'Ihre Rechte',
      content: [
        'Nach der DSGVO haben Sie folgende Rechte:',
        '- **Auskunftsrecht (Art. 15 DSGVO)**: Sie können Auskunft über Ihre gespeicherten Daten verlangen.',
        '- **Berichtigungsrecht (Art. 16 DSGVO)**: Sie können die Berichtigung unrichtiger Daten verlangen.',
        '- **Löschungsrecht (Art. 17 DSGVO)**: Sie können die Löschung Ihrer Daten verlangen ("Recht auf Vergessenwerden").',
        '- **Einschränkungsrecht (Art. 18 DSGVO)**: Sie können die Einschränkung der Verarbeitung verlangen.',
        '- **Datenübertragbarkeit (Art. 20 DSGVO)**: Sie können Ihre Daten in einem gängigen Format erhalten.',
        '- **Widerspruchsrecht (Art. 21 DSGVO)**: Sie können der Verarbeitung widersprechen.',
        '- **Widerrufsrecht (Art. 7 Abs. 3 DSGVO)**: Sie können Ihre Einwilligung jederzeit widerrufen.',
        'Zur Ausübung Ihrer Rechte kontaktieren Sie uns unter: support@papageil.me'
      ]
    },
    {
      id: 'sicherheit',
      icon: '🔒',
      title: 'Datensicherheit',
      content: [
        'Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um Ihre Daten zu schützen:',
        '- SSL/TLS-Verschlüsselung für alle Datenübertragungen',
        '- Verschlüsselte Speicherung von Passwörtern (bcrypt)',
        '- Regelmäßige Sicherheitsupdates',
        '- Zugriffsbeschränkungen auf personenbezogene Daten',
        '- Sichere Server in zertifizierten Rechenzentren'
      ]
    },
    {
      id: 'minderjaehrige',
      icon: '👶',
      title: 'Datenschutz für Minderjährige',
      content: [
        'Unsere Dienste richten sich an Personen ab 16 Jahren. Für die Nutzung durch Minderjährige unter 16 Jahren ist die Zustimmung der Erziehungsberechtigten erforderlich.',
        'Wir erheben wissentlich keine personenbezogenen Daten von Kindern unter 16 Jahren ohne elterliche Zustimmung.'
      ]
    },
    {
      id: 'beschwerderecht',
      icon: '📞',
      title: 'Beschwerderecht bei der Aufsichtsbehörde',
      content: [
        'Bei Beschwerden bezüglich der Verarbeitung Ihrer personenbezogenen Daten können Sie sich an die zuständige Datenschutzaufsichtsbehörde wenden.',
        'Eine Liste der Datenschutzaufsichtsbehörden sowie deren Kontaktdaten finden Sie unter:',
        'https://www.bfdi.bund.de/DE/Service/Anschriften/Laender/Laender-node.html'
      ]
    },
    {
      id: 'aenderungen',
      icon: '🔄',
      title: 'Änderungen dieser Datenschutzerklärung',
      content: [
        'Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an geänderte Rechtslagen oder bei Änderungen des Dienstes anzupassen.',
        'Die aktuelle Version finden Sie stets auf dieser Seite. Bei wesentlichen Änderungen werden registrierte Nutzer per E-Mail informiert.'
      ]
    }
  ]
};

export default function PrivacyPage() {
  const [loading, setLoading] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState('verantwortlicher');
  const [showMobileToC, setShowMobileToC] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSectionId(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -60% 0px' }
    );

    PRIVACY_CONTENT.sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [loading]);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShowMobileToC(false);
    }
  };

  const renderContent = (contentArray) => {
    return contentArray.map((line, index) => {
      const renderWithBold = (text) => {
        const parts = text.split(/\*\*(.*?)\*\*/g);
        return parts.map((part, i) =>
          i % 2 === 1 ? <strong key={i}>{part}</strong> : part
        );
      };

      if (line.startsWith('- ')) {
        return <li key={index}>{renderWithBold(line.substring(2))}</li>;
      } else {
        return <p key={index}>{renderWithBold(line)}</p>;
      }
    });
  };

  const { title, metaDescription, lastUpdated, version, sections } = PRIVACY_CONTENT;

  return (
    <>
      <SEO
        title={title}
        description={metaDescription}
      />

      <Header />

      <div className={styles.container}>
        <div className={styles.wrapper}>
          {/* Sidebar - Table of Contents */}
          <aside className={styles.sidebar}>
            <div className={styles.tocCard}>
              <div className={styles.tocHeader}>
                Inhaltsverzeichnis
              </div>
              <ul className={styles.tocList}>
                {sections.map((section, idx) => (
                  <li key={section.id} className={styles.tocItem}>
                    <button
                      className={`${styles.tocLink} ${activeSectionId === section.id ? styles.active : ''}`}
                      onClick={() => scrollToSection(section.id)}
                    >
                      <span className={styles.tocIcon}>{section.icon}</span>
                      <span>{idx + 1}. {section.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Stats */}
            <div className={styles.statsCard}>
              <div className={styles.statItem}>
                <span className={styles.statIcon}>📅</span>
                <span className={styles.statLabel}>Aktualisiert</span>
                <span className={styles.statValue}>{lastUpdated}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statIcon}>📄</span>
                <span className={styles.statLabel}>Abschnitte</span>
                <span className={styles.statValue}>{sections.length}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statIcon}>🔒</span>
                <span className={styles.statLabel}>Standard</span>
                <span className={styles.statValue}>DSGVO</span>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className={styles.mainContent}>
            {/* Mobile Table of Contents */}
            <div className={styles.mobileToC}>
              <button
                className={styles.mobileToCBtn}
                onClick={() => setShowMobileToC(!showMobileToC)}
              >
                <span className={styles.mobileToCBtnText}>
                  <span>📑</span> Inhaltsverzeichnis ({sections.length} Abschnitte)
                </span>
                <span>{showMobileToC ? '▲' : '▼'}</span>
              </button>
              {showMobileToC && (
                <div className={styles.mobileToCContent}>
                  <ul className={styles.tocList}>
                    {sections.map((section, idx) => (
                      <li key={section.id} className={styles.tocItem}>
                        <button
                          className={styles.tocLink}
                          onClick={() => scrollToSection(section.id)}
                        >
                          <span className={styles.tocIcon}>{section.icon}</span>
                          <span>{idx + 1}. {section.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className={styles.contentCard}>
              {loading ? (
                <div className={styles.loading}>
                  <div className={styles.loadingSpinner}></div>
                  <div>Wird geladen...</div>
                </div>
              ) : (
                <>
                  {/* Hero Section */}
                  <div className={styles.hero}>
                    <div className={styles.heroIcon}>🔐</div>
                    <h1 className={styles.heroTitle}>{title}</h1>
                    <p className={styles.heroSubtitle}>
                      Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst.
                      Hier erfahren Sie, wie wir Ihre Daten verarbeiten und schützen.
                    </p>
                    <div className={styles.heroBadges}>
                      <span className={styles.badge}>
                        <span className={styles.badgeIcon}>🇪🇺</span>
                        DSGVO-konform
                      </span>
                      <span className={styles.badge}>
                        <span className={styles.badgeIcon}>🔒</span>
                        SSL-verschlüsselt
                      </span>
                      <span className={styles.badge}>
                        <span className={styles.badgeIcon}>🇩🇪</span>
                        Server in EU
                      </span>
                    </div>
                  </div>

                  {/* Content Sections */}
                  <div className={styles.sections}>
                    {sections.map((section, idx) => (
                      <section
                        key={section.id}
                        id={section.id}
                        className={styles.section}
                      >
                        <div className={styles.sectionHeader}>
                          <div className={styles.sectionIcon}>{section.icon}</div>
                          <div>
                            <span className={styles.sectionNumber}>§ {idx + 1}</span>
                            <h2 className={styles.sectionTitle}>{section.title}</h2>
                          </div>
                        </div>
                        <div className={styles.sectionContent}>
                          {renderContent(section.content)}
                        </div>
                      </section>
                    ))}

                    {/* Contact Card */}
                    <div className={styles.contactCard}>
                      <h3 className={styles.contactTitle}>
                        <span>📧</span> Fragen zum Datenschutz?
                      </h3>
                      <p style={{ marginBottom: '16px', color: '#636e72' }}>
                        Bei Fragen zur Verarbeitung Ihrer Daten kontaktieren Sie uns:
                      </p>
                      <a href="mailto:support@papageil.me" className={styles.contactEmail}>
                        <span>✉️</span>
                        support@papageil.me
                      </a>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className={styles.footer}>
                    <div className={styles.lastUpdated}>
                      <span>📅</span>
                      Zuletzt aktualisiert: <span className={styles.effectiveDate}>{lastUpdated}</span>
                    </div>
                    <span className={styles.version}>Version {version}</span>
                  </div>

                  {/* Share Buttons */}
                  <div style={{ padding: '0 40px 32px 40px' }}>
                    <ShareButtons
                      title={title}
                      description={metaDescription}
                    />
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
