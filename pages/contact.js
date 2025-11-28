import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import ShareButtons from '../components/ShareButtons';
import styles from '../styles/StaticPage.module.css';

export default function ContactPage() {
  const { t } = useTranslation();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPageContent();
  }, []);

  const fetchPageContent = async () => {
    try {
      const res = await fetch('/api/page-content/contact');
      if (res.ok) {
        const data = await res.json();
        setPageData(data);
      }
    } catch (error) {
      console.error('Error fetching page content:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (content) => {
    return content.split('\n').map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index}>{line.substring(2)}</h1>;
      } else if (line.startsWith('## ')) {
        return <h2 key={index}>{line.substring(3)}</h2>;
      } else if (line.startsWith('### ')) {
        return <h3 key={index}>{line.substring(4)}</h3>;
      } else if (line.startsWith('- ')) {
        return <li key={index}>{line.substring(2)}</li>;
      } else if (line.trim() === '') {
        return <br key={index} />;
      } else {
        return <p key={index}>{line}</p>;
      }
    });
  };

  return (
    <>
      <Head>
        <title>{pageData?.title || 'Kontakt'}</title>
        <meta name="description" content={pageData?.metaDescription || ''} />
      </Head>
      
      <Header />
      
      <div className={styles.container}>
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>{t('staticPages.loading')}</div>
          ) : pageData ? (
            <>
              <div className={styles.pageContent}>
                {renderContent(pageData.content)}
              </div>
              <ShareButtons 
                title={pageData.title}
                description={pageData.metaDescription}
              />
            </>
          ) : (
            <div className={styles.error}>{t('staticPages.notFound')}</div>
          )}
        </div>
      </div>
    </>
  );
}
