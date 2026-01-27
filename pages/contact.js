import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import Header from '../components/Header';
import styles from '../styles/Contact.module.css';

// FAQ Data
const FAQ_DATA = [
  {
    id: 'response-time',
    icon: '⏱️',
    question: 'Wie lange dauert es, bis ich eine Antwort erhalte?',
    answer: 'Wir bemühen uns, alle Anfragen innerhalb von 24-48 Stunden zu beantworten. Bei komplexeren Anliegen kann es etwas länger dauern.'
  },
  {
    id: 'technical',
    icon: '🔧',
    question: 'Ich habe technische Probleme mit der App. Was soll ich tun?',
    answer: 'Bitte beschreiben Sie das Problem so detailliert wie möglich und geben Sie Ihr Gerät sowie die Browserversion an. Screenshots helfen uns bei der schnellen Lösung.'
  },
  {
    id: 'account',
    icon: '👤',
    question: 'Wie kann ich mein Konto löschen?',
    answer: 'Senden Sie uns eine E-Mail an support@papageil.net mit dem Betreff "Kontolöschung" und wir werden Ihre Anfrage schnellstmöglich bearbeiten.'
  },
  {
    id: 'partnership',
    icon: '🤝',
    question: 'Gibt es Möglichkeiten zur Zusammenarbeit?',
    answer: 'Ja! Wir sind offen für Partnerschaften, Content-Creator-Kooperationen und B2B-Lösungen. Kontaktieren Sie uns gerne mit Ihren Ideen.'
  }
];

// Subject options
const SUBJECT_OPTIONS = [
  { value: '', label: 'Bitte wählen...' },
  { value: 'general', label: '💬 Allgemeine Anfrage' },
  { value: 'technical', label: '🔧 Technisches Problem' },
  { value: 'account', label: '👤 Konto & Anmeldung' },
  { value: 'feedback', label: '💡 Feedback & Vorschläge' },
  { value: 'partnership', label: '🤝 Partnerschaft & Kooperation' },
  { value: 'other', label: '📝 Sonstiges' }
];

export default function ContactPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  const [openFaqId, setOpenFaqId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    // Simulate loading for smooth animation
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitStatus(null);

    try {
      // Send to API
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFaq = (id) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  if (loading) {
    return (
      <>
        <SEO title="Kontakt" description="Kontaktieren Sie PapaGeil" />
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
        title="Kontakt"
        description="Kontaktieren Sie das PapaGeil-Team - Wir helfen Ihnen gerne bei Fragen zum Deutsch lernen, technischen Problemen oder Partnerschaftsanfragen."
      />

      <Header />

      <div className={styles.container}>
        <div className={styles.wrapper}>
          {/* Hero Section */}
          <div className={styles.hero}>
            <div className={styles.heroIcon}>💬</div>
            <h1 className={styles.heroTitle}>Kontaktieren Sie uns</h1>
            <p className={styles.heroSubtitle}>
              Haben Sie Fragen, Anregungen oder benötigen Sie Hilfe?
              Unser Team ist für Sie da und freut sich auf Ihre Nachricht!
            </p>
          </div>

          {/* Contact Cards */}
          <div className={styles.contactCards}>
            <div className={styles.contactCard}>
              <div className={styles.cardIcon}>📧</div>
              <h3 className={styles.cardTitle}>E-Mail Support</h3>
              <p className={styles.cardDescription}>
                Schreiben Sie uns direkt per E-Mail für alle Anfragen
              </p>
              <a href="mailto:support@papageil.net" className={styles.cardLink}>
                <span>✉️</span>
                support@papageil.net
              </a>
            </div>

            <div className={styles.contactCard}>
              <div className={styles.cardIcon}>⚡</div>
              <h3 className={styles.cardTitle}>Schnelle Antwort</h3>
              <p className={styles.cardDescription}>
                Durchschnittliche Antwortzeit für Ihre Anfragen
              </p>
              <span className={styles.cardValue}>24-48 Stunden</span>
            </div>

            <div className={styles.contactCard}>
              <div className={styles.cardIcon}>🌐</div>
              <h3 className={styles.cardTitle}>Social Media</h3>
              <p className={styles.cardDescription}>
                Folgen Sie uns für Updates und Community-Support
              </p>
              <a href="https://www.youtube.com/@papageil" target="_blank" rel="noopener noreferrer" className={styles.cardLink}>
                <span>▶️</span>
                YouTube
              </a>
            </div>
          </div>

          {/* Main Grid - Form + FAQ */}
          <div className={styles.mainGrid}>
            {/* Contact Form */}
            <div className={styles.formCard}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>
                  <span>✍️</span>
                  Nachricht senden
                </h2>
                <p className={styles.formSubtitle}>
                  Füllen Sie das Formular aus und wir melden uns bei Ihnen.
                </p>
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
                {submitStatus === 'success' && (
                  <div className={styles.successMessage}>
                    <span>✅</span>
                    Vielen Dank! Ihre Nachricht wurde erfolgreich gesendet. Wir melden uns bald bei Ihnen.
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className={styles.errorMessage}>
                    <span>❌</span>
                    Leider ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder schreiben Sie uns direkt per E-Mail.
                  </div>
                )}

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Name <span>*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={styles.formInput}
                      placeholder="Ihr vollständiger Name"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      E-Mail <span>*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={styles.formInput}
                      placeholder="ihre@email.de"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Betreff <span>*</span>
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className={styles.formSelect}
                    required
                  >
                    {SUBJECT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Nachricht <span>*</span>
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    className={styles.formTextarea}
                    placeholder="Beschreiben Sie Ihr Anliegen so detailliert wie möglich..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className={styles.submitBtnIcon}>⏳</span>
                      Wird gesendet...
                    </>
                  ) : (
                    <>
                      <span className={styles.submitBtnIcon}>🚀</span>
                      Nachricht senden
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* FAQ Section */}
            <div className={styles.faqCard}>
              <div className={styles.faqHeader}>
                <h2 className={styles.faqTitle}>
                  <span>❓</span>
                  Häufige Fragen
                </h2>
              </div>

              <div className={styles.faqList}>
                {FAQ_DATA.map(faq => (
                  <div key={faq.id} className={styles.faqItem}>
                    <button
                      className={styles.faqQuestion}
                      onClick={() => toggleFaq(faq.id)}
                    >
                      <span className={styles.faqQuestionText}>
                        <span className={styles.faqQuestionIcon}>{faq.icon}</span>
                        {faq.question}
                      </span>
                      <span className={`${styles.faqToggle} ${openFaqId === faq.id ? styles.open : ''}`}>
                        +
                      </span>
                    </button>
                    {openFaqId === faq.id && (
                      <div className={styles.faqAnswer}>
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Company Info */}
          <div className={styles.companyCard}>
            <h3 className={styles.companyTitle}>
              <span>🏢</span>
              Unternehmensinformationen
            </h3>
            <div className={styles.companyInfo}>
              <div className={styles.companyItem}>
                <div className={styles.companyItemIcon}>🏷️</div>
                <div className={styles.companyItemLabel}>Firma</div>
                <div className={styles.companyItemValue}>PAPAGEIL CO., LTD.</div>
              </div>
              <div className={styles.companyItem}>
                <div className={styles.companyItemIcon}>📧</div>
                <div className={styles.companyItemLabel}>E-Mail</div>
                <div className={styles.companyItemValue}>support@papageil.net</div>
              </div>
              <div className={styles.companyItem}>
                <div className={styles.companyItemIcon}>🌐</div>
                <div className={styles.companyItemLabel}>Website</div>
                <div className={styles.companyItemValue}>papageil.net</div>
              </div>
              <div className={styles.companyItem}>
                <div className={styles.companyItemIcon}>🌍</div>
                <div className={styles.companyItemLabel}>Sprachen</div>
                <div className={styles.companyItemValue}>DE, EN, VI</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
