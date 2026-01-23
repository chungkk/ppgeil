import { useState, useEffect } from 'react';
import SEO from '../components/SEO';
import Header from '../components/Header';
import ShareButtons from '../components/ShareButtons';
import styles from '../styles/Terms.module.css';

// Default Terms content - Professional German Terms of Service
const DEFAULT_TERMS_CONTENT = {
  title: 'Nutzungsbedingungen',
  metaDescription: 'Allgemeine Nutzungsbedingungen für PapaGeil - Ihre Plattform zum Deutsch lernen',
  lastUpdated: '23. Januar 2026',
  version: '2.0',
  sections: [
    {
      id: 'geltungsbereich',
      icon: '📋',
      title: 'Geltungsbereich',
      content: [
        'Diese Nutzungsbedingungen regeln die Nutzung der Website papageil.net und der zugehörigen mobilen Anwendung "PapaGeil" (nachfolgend gemeinsam als "Plattform" bezeichnet).',
        'Der Anbieter der Plattform ist:',
        '**PAPAGEIL CO., LTD.**',
        'E-Mail: support@papageil.me',
        'Mit der Registrierung oder Nutzung unserer Plattform akzeptieren Sie diese Nutzungsbedingungen vollständig. Wenn Sie mit diesen Bedingungen nicht einverstanden sind, dürfen Sie unsere Dienste nicht nutzen.'
      ]
    },
    {
      id: 'leistungsbeschreibung',
      icon: '🎯',
      title: 'Leistungsbeschreibung',
      content: [
        'PapaGeil ist eine interaktive Lernplattform zum Erlernen der deutschen Sprache. Unsere Dienste umfassen:',
        '- **Shadowing-Übungen**: Verbessern Sie Ihre Aussprache durch das Nachsprechen von authentischen deutschen Inhalten',
        '- **Diktat-Übungen**: Trainieren Sie Ihr Hörverstehen und Ihre Rechtschreibung',
        '- **Vokabeltrainer**: Erweitern Sie Ihren deutschen Wortschatz systematisch',
        '- **Lernmaterialien**: Zugang zu kuratierten YouTube-Videos in verschiedenen Schwierigkeitsstufen (A1-C2)',
        '- **Fortschrittsverfolgung**: Personalisierte Statistiken zu Ihrem Lernfortschritt',
        'Der Umfang der verfügbaren Funktionen kann je nach Nutzerstatus (Gast, registrierter Nutzer, Premium-Nutzer) variieren.'
      ]
    },
    {
      id: 'registrierung',
      icon: '👤',
      title: 'Registrierung und Nutzerkonto',
      content: [
        '**3.1 Registrierung**',
        'Für die vollständige Nutzung unserer Dienste ist eine Registrierung erforderlich. Bei der Registrierung müssen Sie:',
        '- Wahrheitsgemäße und vollständige Angaben machen',
        '- Eine gültige E-Mail-Adresse angeben',
        '- Ein sicheres Passwort wählen',
        '**3.2 Kontosicherheit**',
        'Sie sind für die Geheimhaltung Ihrer Zugangsdaten verantwortlich. Teilen Sie Ihre Zugangsdaten nicht mit Dritten. Bei Verdacht auf unbefugte Nutzung Ihres Kontos sind Sie verpflichtet, uns unverzüglich zu informieren.',
        '**3.3 Altersbeschränkung**',
        'Die Nutzung unserer Plattform ist für Personen ab 16 Jahren bestimmt. Minderjährige unter 16 Jahren benötigen die Zustimmung eines Erziehungsberechtigten.'
      ]
    },
    {
      id: 'punkte-system',
      icon: '💎',
      title: 'Punktesystem und Freischaltungen',
      content: [
        '**4.1 Punktesystem**',
        'Unsere Plattform verwendet ein Punktesystem zur Freischaltung von Premium-Inhalten:',
        '- Neue registrierte Nutzer erhalten 2 kostenlose Freischaltungen',
        '- Zusätzliche Punkte können durch verschiedene Aktivitäten verdient werden',
        '- Punkte können zum Freischalten weiterer Lektionen verwendet werden',
        '**4.2 Freischaltungen**',
        'Einmal freigeschaltete Inhalte bleiben dauerhaft für Ihr Konto verfügbar. Es gibt keine zeitliche Begrenzung für den Zugang zu freigeschalteten Lektionen.',
        '**4.3 Keine Rückerstattung**',
        'Eingesetzte Punkte oder verwendete Freischaltungen können nicht zurückerstattet werden.'
      ]
    },
    {
      id: 'urheberrecht',
      icon: '©️',
      title: 'Urheberrecht und geistiges Eigentum',
      content: [
        '**5.1 Plattform-Inhalte**',
        'Alle Inhalte der Plattform (Texte, Grafiken, Logos, Software) sind urheberrechtlich geschützt und Eigentum von PAPAGEIL CO., LTD. oder werden mit Genehmigung verwendet.',
        '**5.2 YouTube-Inhalte**',
        'Die auf unserer Plattform eingebetteten YouTube-Videos bleiben Eigentum ihrer jeweiligen Ersteller. Wir nutzen die YouTube API-Dienste gemäß der YouTube Terms of Service (https://www.youtube.com/t/terms).',
        '**5.3 Nutzungsrechte**',
        'Mit der Nutzung unserer Plattform erhalten Sie ein nicht-exklusives, nicht übertragbares, widerrufliches Recht zur persönlichen, nicht-kommerziellen Nutzung unserer Dienste.',
        '**5.4 Verbotene Handlungen**',
        '- Kopieren, Modifizieren oder Verbreiten von Plattform-Inhalten',
        '- Kommerzielle Nutzung ohne ausdrückliche Genehmigung',
        '- Reverse Engineering der Software',
        '- Umgehen von technischen Schutzmaßnahmen'
      ]
    },
    {
      id: 'nutzerverhalten',
      icon: '⚠️',
      title: 'Verhaltensregeln',
      content: [
        'Bei der Nutzung unserer Plattform verpflichten Sie sich:',
        '- Die Plattform nur für den vorgesehenen Zweck des Sprachenlernens zu nutzen',
        '- Keine illegalen, beleidigenden oder schädlichen Inhalte zu verbreiten',
        '- Die Rechte anderer Nutzer zu respektieren',
        '- Keine automatisierten Zugriffe (Bots, Scraper) ohne Genehmigung einzusetzen',
        '- Keine Schadsoftware oder Viren zu verbreiten',
        '- Keine falschen oder irreführenden Informationen zu verbreiten',
        'Verstöße gegen diese Regeln können zur sofortigen Sperrung Ihres Kontos führen.'
      ]
    },
    {
      id: 'haftung',
      icon: '⚖️',
      title: 'Haftung und Gewährleistung',
      content: [
        '**7.1 Verfügbarkeit**',
        'Wir bemühen uns um eine hohe Verfügbarkeit unserer Dienste, garantieren jedoch keine ununterbrochene Erreichbarkeit. Wartungsarbeiten und technische Störungen können zu vorübergehenden Einschränkungen führen.',
        '**7.2 Haftungsausschluss**',
        'Die Nutzung der Plattform erfolgt auf eigenes Risiko. Wir haften nicht für:',
        '- Lernerfolge oder Prüfungsergebnisse',
        '- Inhalte von eingebetteten YouTube-Videos',
        '- Schäden durch fehlerhafte Nutzung der Plattform',
        '- Datenverluste, soweit diese nicht durch unser Verschulden entstanden sind',
        '**7.3 Haftungsbeschränkung**',
        'Unsere Haftung ist auf Vorsatz und grobe Fahrlässigkeit beschränkt. Bei leichter Fahrlässigkeit haften wir nur für die Verletzung wesentlicher Vertragspflichten (Kardinalpflichten).'
      ]
    },
    {
      id: 'datenschutz',
      icon: '🔒',
      title: 'Datenschutz',
      content: [
        'Der Schutz Ihrer persönlichen Daten ist uns wichtig. Die Verarbeitung Ihrer Daten erfolgt gemäß der Datenschutz-Grundverordnung (DSGVO) und unserer Datenschutzerklärung.',
        'Details zur Datenverarbeitung finden Sie in unserer **Datenschutzerklärung** unter /privacy.',
        'Durch die Nutzung unserer Plattform stimmen Sie der in der Datenschutzerklärung beschriebenen Datenverarbeitung zu.'
      ]
    },
    {
      id: 'kuendigung',
      icon: '🚪',
      title: 'Kündigung und Kontolöschung',
      content: [
        '**9.1 Kündigung durch den Nutzer**',
        'Sie können Ihr Konto jederzeit und ohne Angabe von Gründen löschen lassen. Senden Sie hierzu eine E-Mail an support@papageil.me.',
        '**9.2 Kündigung durch den Anbieter**',
        'Wir behalten uns das Recht vor, Nutzerkonten bei Verstoß gegen diese Nutzungsbedingungen zu sperren oder zu löschen.',
        '**9.3 Folgen der Kündigung**',
        'Bei Kontolöschung werden:',
        '- Ihre persönlichen Daten gemäß unserer Datenschutzerklärung gelöscht',
        '- Erworbene Punkte und Freischaltungen verfallen',
        '- Der Zugang zu allen Inhalten beendet'
      ]
    },
    {
      id: 'aenderungen',
      icon: '🔄',
      title: 'Änderungen der Nutzungsbedingungen',
      content: [
        'Wir behalten uns das Recht vor, diese Nutzungsbedingungen jederzeit zu ändern. Änderungen werden:',
        '- Auf der Plattform veröffentlicht',
        '- Per E-Mail an registrierte Nutzer kommuniziert (bei wesentlichen Änderungen)',
        'Die fortgesetzte Nutzung der Plattform nach Änderungen gilt als Zustimmung zu den neuen Bedingungen.',
        'Die jeweils aktuelle Version finden Sie unter /terms.'
      ]
    },
    {
      id: 'schlussbestimmungen',
      icon: '📜',
      title: 'Schlussbestimmungen',
      content: [
        '**11.1 Anwendbares Recht**',
        'Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.',
        '**11.2 Gerichtsstand**',
        'Für alle Streitigkeiten aus oder im Zusammenhang mit diesen Nutzungsbedingungen ist, soweit gesetzlich zulässig, der Sitz des Anbieters Gerichtsstand.',
        '**11.3 Salvatorische Klausel**',
        'Sollten einzelne Bestimmungen dieser Nutzungsbedingungen unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen davon unberührt.',
        '**11.4 Vollständigkeit**',
        'Diese Nutzungsbedingungen stellen die gesamte Vereinbarung zwischen Ihnen und PAPAGEIL CO., LTD. dar und ersetzen alle vorherigen Vereinbarungen.'
      ]
    }
  ]
};

export default function TermsPage() {
  const [loading, setLoading] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState('geltungsbereich');
  const [showMobileToC, setShowMobileToC] = useState(false);

  useEffect(() => {
    // Simulate loading for smooth animation
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Set up intersection observer for active section tracking
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

    // Observe all sections
    DEFAULT_TERMS_CONTENT.sections.forEach(({ id }) => {
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
      // Handle bold text
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

  const { title, metaDescription, lastUpdated, version, sections } = DEFAULT_TERMS_CONTENT;

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
                <span className={styles.statIcon}>🏛️</span>
                <span className={styles.statLabel}>Recht</span>
                <span className={styles.statValue}>🇩🇪 DE</span>
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
                    <div className={styles.heroIcon}>📜</div>
                    <h1 className={styles.heroTitle}>{title}</h1>
                    <p className={styles.heroSubtitle}>
                      Bitte lesen Sie diese Nutzungsbedingungen sorgfältig durch,
                      bevor Sie die Dienste von PapaGeil nutzen.
                    </p>
                    <div className={styles.heroBadges}>
                      <span className={styles.badge}>
                        <span className={styles.badgeIcon}>✅</span>
                        Rechtsgültig
                      </span>
                      <span className={styles.badge}>
                        <span className={styles.badgeIcon}>🔒</span>
                        DSGVO-konform
                      </span>
                      <span className={styles.badge}>
                        <span className={styles.badgeIcon}>🇩🇪</span>
                        Deutsches Recht
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
                        <span>📧</span> Fragen zu den Nutzungsbedingungen?
                      </h3>
                      <p style={{ marginBottom: '16px', color: '#636e72' }}>
                        Bei Fragen zu diesen Nutzungsbedingungen kontaktieren Sie uns gerne:
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
