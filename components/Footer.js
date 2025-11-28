import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { FaFacebookF, FaInstagram, FaYoutube, FaTiktok, FaLinkedinIn, FaGithub } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import styles from '../styles/Footer.module.css';

const SOCIAL_CONFIG = [
  { key: 'facebookUrl', icon: FaFacebookF, label: 'Facebook' },
  { key: 'twitterUrl', icon: FaXTwitter, label: 'Twitter/X' },
  { key: 'instagramUrl', icon: FaInstagram, label: 'Instagram' },
  { key: 'youtubeUrl', icon: FaYoutube, label: 'YouTube' },
  { key: 'tiktokUrl', icon: FaTiktok, label: 'TikTok' },
  { key: 'linkedinUrl', icon: FaLinkedinIn, label: 'LinkedIn' },
  { key: 'githubUrl', icon: FaGithub, label: 'GitHub' }
];

const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [socialLinks, setSocialLinks] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchSocialLinks = async () => {
      try {
        const res = await fetch('/api/settings/public');
        if (res.ok && isMounted) {
          const data = await res.json();
          setSocialLinks(data);
        }
      } catch (error) {
        console.error('Error fetching social links:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    fetchSocialLinks();
    
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerSection}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>🦜</div>
            <span className={styles.footerBrandText}>{t('header.logo')}</span>
          </div>
           <p className={styles.footerDescription}>
             {t('footer.description')}
           </p>
        </div>

        <div className={styles.footerSection}>
          <h4 className={styles.footerSectionTitle}>{t('footer.sections.information')}</h4>
          <div className={styles.footerLinks}>
            <Link href="/privacy" className={styles.footerLink}>
              {t('footer.links.privacy')}
            </Link>
            <Link href="/about" className={styles.footerLink}>
              {t('footer.links.about')}
            </Link>
            <Link href="/terms" className={styles.footerLink}>
              {t('footer.links.terms')}
            </Link>
            <Link href="/contact" className={styles.footerLink}>
              {t('footer.links.contact')}
            </Link>
            <Link href="/feedback" className={styles.footerLink}>
              {t('footer.links.feedback')}
            </Link>
          </div>
        </div>

        <div className={styles.footerSection}>
          <h4 className={styles.footerSectionTitle}>{t('footer.sections.features')}</h4>
          <div className={styles.footerLinks}>
            <Link href="/?mode=shadowing" className={styles.footerLink}>
              {t('footer.links.shadowing')}
            </Link>
            <Link href="/?mode=dictation" className={styles.footerLink}>
              {t('footer.links.dictation')}
            </Link>
            <Link href="/profile/vocabulary" className={styles.footerLink}>
              {t('footer.links.vocabulary')}
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <div className={styles.copyright}>
          © {currentYear} PAPAGEIL CO., LTD. {t('footer.copyright')}
        </div>

        <div className={styles.socialLinks}>
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className={styles.socialSkeleton} />
            ))
          ) : (
            SOCIAL_CONFIG.map(({ key, icon: Icon, label }) => 
              socialLinks[key] && (
                <a 
                  key={key}
                  href={socialLinks[key]} 
                  className={styles.socialLink} 
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon />
                </a>
              )
            )
          )}
        </div>

        <div className={styles.madeWith}>
          <span>{t('footer.madeWith')}</span>
          <span className={styles.heart}>❤</span>
          <span>{t('footer.by')}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
