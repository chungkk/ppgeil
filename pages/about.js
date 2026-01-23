import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import SEO from '../components/SEO';
import Header from '../components/Header';
import ShareButtons from '../components/ShareButtons';
import styles from '../styles/About.module.css';

// Features data
const FEATURES = [
  {
    icon: '🎧',
    title: 'Shadowing-Methode',
    description: 'Verbessern Sie Ihre Aussprache durch das Nachsprechen von Muttersprachlern in Echtzeit.'
  },
  {
    icon: '✍️',
    title: 'Diktat-Übungen',
    description: 'Trainieren Sie Ihr Hörverstehen und Ihre Rechtschreibung mit authentischen deutschen Texten.'
  },
  {
    icon: '📚',
    title: 'Vokabeltrainer',
    description: 'Erweitern Sie systematisch Ihren Wortschatz mit personalisierten Lernkarten.'
  },
  {
    icon: '🎬',
    title: 'YouTube Integration',
    description: 'Lernen Sie mit echten YouTube-Videos von deutschen Content-Creatoren.'
  },
  {
    icon: '📊',
    title: 'Lernstatistiken',
    description: 'Verfolgen Sie Ihren Fortschritt mit detaillierten Statistiken und Analysen.'
  },
  {
    icon: '🏆',
    title: 'Gamification',
    description: 'Motivieren Sie sich mit Punkten, Freischaltungen und der Bestenliste.'
  }
];

// Why PapaGeil reasons
const WHY_REASONS = [
  { icon: '✅', text: 'Kostenlos starten - keine Kreditkarte erforderlich' },
  { icon: '🎯', text: 'Alle Niveaustufen von A1 bis C2' },
  { icon: '📱', text: 'Überall lernen - Web & Mobile' },
  { icon: '🎬', text: 'Authentische Inhalte von Muttersprachlern' },
  { icon: '⚡', text: 'Sofortiges Feedback für schnelleren Fortschritt' },
  { icon: '🔓', text: 'Neue Lektionen regelmäßig freigeschaltet' }
];

// Stats data
const STATS = [
  { icon: '📚', number: '100+', label: 'Lektionen' },
  { icon: '🎬', number: '50+', label: 'Videos' },
  { icon: '📝', number: '5000+', label: 'Vokabeln' },
  { icon: '🌍', number: '3', label: 'Sprachen' }
];

export default function AboutPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <>
        <SEO title="Über uns" description="Erfahren Sie mehr über PapaGeil" />
        <Header />
        <div className={styles.container}>
          <div className={styles.wrapper}>
            <div style={{ textAlign: 'center', padding: '100px 20px' }}>
              Laden...
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Über uns"
        description="Erfahren Sie mehr über PapaGeil - Ihre innovative Plattform zum Deutsch lernen mit Shadowing, Diktat und Vokabeltraining. Entdecken Sie unsere Mission und Methoden."
      />

      <Header />

      <div className={styles.container}>
        <div className={styles.wrapper}>
          {/* Hero Section */}
          <section className={styles.hero}>
            <div className={styles.heroBrand}>
              <div className={styles.heroLogo}>
                <Image
                  src="/logo.jpg"
                  alt="PapaGeil Logo"
                  width={100}
                  height={100}
                  priority
                />
              </div>
              <h1 className={styles.heroTitle}>PapaGeil</h1>
            </div>

            <p className={styles.heroTagline}>
              Deutsch lernen. Einfach. Effektiv. Macht Spaß! 🚀
            </p>

            <p className={styles.heroDescription}>
              PapaGeil ist eine innovative Lernplattform, die das Erlernen der deutschen Sprache
              revolutioniert. Durch die Kombination von Shadowing-Techniken, Diktat-Übungen und
              modernster Technologie machen wir das Deutschlernen zu einem interaktiven und
              motivierenden Erlebnis.
            </p>

            <div className={styles.heroBadges}>
              <span className={styles.heroBadge}>
                <span className={styles.badgeIcon}>🇩🇪</span>
                Made in Germany
              </span>
              <span className={styles.heroBadge}>
                <span className={styles.badgeIcon}>🎓</span>
                A1-C2 Niveaus
              </span>
              <span className={styles.heroBadge}>
                <span className={styles.badgeIcon}>💯</span>
                100% Deutsch
              </span>
            </div>
          </section>

          {/* Stats Section */}
          <section className={styles.stats}>
            {STATS.map((stat, idx) => (
              <div key={idx} className={styles.statCard}>
                <div className={styles.statIcon}>{stat.icon}</div>
                <div className={styles.statNumber}>{stat.number}</div>
                <div className={styles.statLabel}>{stat.label}</div>
              </div>
            ))}
          </section>

          {/* Mission & Vision Section */}
          <section className={styles.missionSection}>
            <div className={styles.missionCard}>
              <div className={styles.missionContent}>
                <div className={styles.missionItem}>
                  <div className={styles.missionIcon}>🎯</div>
                  <h2 className={styles.missionTitle}>Unsere Mission</h2>
                  <p className={styles.missionText}>
                    Wir möchten jedem Menschen die Möglichkeit geben, Deutsch auf eine
                    natürliche und effektive Weise zu lernen. Unser Ziel ist es, die
                    Barrieren beim Sprachenlernen abzubauen und authentische Lernerfahrungen
                    zu bieten, die Spaß machen und nachhaltige Ergebnisse liefern.
                  </p>
                </div>
                <div className={styles.missionItem}>
                  <div className={styles.missionIcon}>🔮</div>
                  <h2 className={styles.missionTitle}>Unsere Vision</h2>
                  <p className={styles.missionText}>
                    Wir träumen von einer Welt, in der Sprachbarrieren keine Hindernisse
                    mehr sind. PapaGeil soll die führende Plattform werden, die Menschen
                    weltweit dabei hilft, Deutsch zu meistern - unabhängig von ihrem
                    Hintergrund oder Budget.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className={styles.featuresSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <span>✨</span>
                Unsere Lernmethoden
              </h2>
              <p className={styles.sectionSubtitle}>
                Entdecken Sie die Funktionen, die PapaGeil besonders machen
              </p>
            </div>

            <div className={styles.featuresGrid}>
              {FEATURES.map((feature, idx) => (
                <div key={idx} className={styles.featureCard}>
                  <div className={styles.featureIcon}>{feature.icon}</div>
                  <h3 className={styles.featureTitle}>{feature.title}</h3>
                  <p className={styles.featureDescription}>{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Why PapaGeil Section */}
          <section className={styles.whySection}>
            <div className={styles.whyCard}>
              <h2 className={styles.whyTitle}>
                Warum PapaGeil? 🤔
              </h2>
              <div className={styles.whyList}>
                {WHY_REASONS.map((reason, idx) => (
                  <div key={idx} className={styles.whyItem}>
                    <span className={styles.whyItemIcon}>{reason.icon}</span>
                    <span className={styles.whyItemText}>{reason.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>
                Bereit, Ihr Deutsch zu verbessern? 🚀
              </h2>
              <p className={styles.ctaText}>
                Starten Sie noch heute kostenlos und entdecken Sie, wie einfach und
                effektiv Deutschlernen mit PapaGeil sein kann!
              </p>
              <div className={styles.ctaButtons}>
                <Link href="/" className={`${styles.ctaBtn} ${styles.ctaBtnPrimary}`}>
                  <span className={styles.ctaBtnIcon}>🎓</span>
                  Jetzt starten
                </Link>
                <Link href="/contact" className={`${styles.ctaBtn} ${styles.ctaBtnSecondary}`}>
                  <span className={styles.ctaBtnIcon}>💬</span>
                  Kontakt
                </Link>
              </div>
            </div>
          </section>

          {/* Share Buttons */}
          <div style={{ marginTop: '40px' }}>
            <ShareButtons
              title="Über PapaGeil - Deutsch lernen leicht gemacht"
              description="Erfahren Sie mehr über unsere innovative Plattform zum Deutschlernen"
            />
          </div>
        </div>
      </div>
    </>
  );
}
