import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

const SEO = ({
  title = 'PapaGeil - Learn German with Shadowing & Dictation',
  description = 'Master German pronunciation and speaking skills with interactive shadowing and dictation exercises using YouTube videos. Perfect for all levels from A1 to C2.',
  keywords = 'German learning, Deutsch lernen, shadowing method, dictation practice, pronunciation, speaking skills, A1, A2, B1, B2, C1, C2, German course online',
  ogImage = '/og-image.jpg',
  ogUrl,
  ogType = 'website',
  article,
  canonicalUrl,
  noindex = false,
  nofollow = false,
  locale = 'de_DE',
  alternateLocales = ['en_US', 'vi_VN'],
  structuredData,
  author,
  publishedTime,
  modifiedTime,
}) => {
  const router = useRouter();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://papageil.net';
  const siteTitle = title.includes('PapaGeil') ? title : `${title} | PapaGeil - Learn German`;
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`;
  const fullCanonicalUrl = canonicalUrl || `${siteUrl}${router.asPath}`;
  const fullOgUrl = ogUrl || fullCanonicalUrl;

  return (
    <Head>
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Robots Meta Tags */}
      {(noindex || nofollow) && (
        <meta name="robots" content={`${noindex ? 'noindex' : 'index'},${nofollow ? 'nofollow' : 'follow'}`} />
      )}

      {/* Canonical URL */}
      <link rel="canonical" href={fullCanonicalUrl} />

      {/* hreflang for multilingual SEO */}
      <link rel="alternate" hrefLang="de" href={`${siteUrl}${router.asPath.split('?')[0]}`} />
      <link rel="alternate" hrefLang="en" href={`${siteUrl}/en${router.asPath.split('?')[0]}`} />
      <link rel="alternate" hrefLang="vi" href={`${siteUrl}/vi${router.asPath.split('?')[0]}`} />
      <link rel="alternate" hrefLang="x-default" href={fullCanonicalUrl} />

      {/* Language/Locale Meta Tags */}

      <meta property="og:locale" content={locale} />
      {alternateLocales.map((altLocale) => (
        <meta key={altLocale} property="og:locale:alternate" content={altLocale} />
      ))}

      {/* Author Meta Tag */}
      {author && <meta name="author" content={author} />}

      {/* Open Graph / Facebook */}
      <meta property="og:site_name" content="PapaGeil - Learn German" />
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={siteTitle} />
      <meta property="og:url" content={fullOgUrl} />

      {/* Article specific tags */}
      {ogType === 'article' && (
        <>
          {publishedTime && <meta property="article:published_time" content={publishedTime} />}
          {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
          {author && <meta property="article:author" content={author} />}
          {article?.section && <meta property="article:section" content={article.section} />}
          {article?.tags && article.tags.map((tag, index) => (
            <meta key={index} property="article:tag" content={tag} />
          ))}
        </>
      )}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@papageil_de" />
      <meta name="twitter:creator" content="@papageil_de" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullOgImage} />
      <meta name="twitter:image:alt" content={siteTitle} />

      {/* Additional SEO Meta Tags */}
      <meta name="application-name" content="PapaGeil" />
      <meta name="apple-mobile-web-app-title" content="PapaGeil" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="format-detection" content="telephone=no" />

      {/* Verification Meta Tags (add your own IDs) */}
      {/* <meta name="google-site-verification" content="YOUR_GOOGLE_VERIFICATION_CODE" /> */}
      {/* <meta name="yandex-verification" content="YOUR_YANDEX_VERIFICATION_CODE" /> */}
      {/* <meta name="msvalidate.01" content="YOUR_BING_VERIFICATION_CODE" /> */}

      {/* Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
    </Head>
  );
};

export const generateBreadcrumbStructuredData = (breadcrumbs) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
};

export const generateVideoStructuredData = (lesson) => {
  if (!lesson) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: lesson.title || lesson.displayTitle,
    description: lesson.description || `Learn German with this ${lesson.difficulty || 'beginner'} level lesson`,
    thumbnailUrl: lesson.thumbnail || lesson.thumbnailUrl,
    uploadDate: lesson.createdAt || new Date().toISOString(),
    duration: lesson.duration ? `PT${Math.floor(lesson.duration / 60)}M${lesson.duration % 60}S` : undefined,
    contentUrl: lesson.youtubeUrl || lesson.videoUrl,
    embedUrl: lesson.youtubeUrl || lesson.videoUrl,
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/WatchAction',
      userInteractionCount: lesson.viewCount || 0
    },
    educationalLevel: mapDifficultyToEducationalLevel(lesson.difficulty),
    learningResourceType: 'Video Exercise',
    educationalAlignment: {
      '@type': 'AlignmentObject',
      alignmentType: 'educationalLevel',
      educationalFramework: 'CEFR',
      targetName: mapDifficultyToCEFR(lesson.difficulty),
    },
  };
};

export const generateCourseStructuredData = (lessons, difficulty) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: `German ${difficulty ? difficulty.toUpperCase() : ''} Course - Shadowing & Dictation`,
    description: 'Comprehensive German language course using shadowing and dictation methods with real YouTube content',
    provider: {
      '@type': 'Organization',
      name: 'PapaGeil',
      sameAs: 'https://papageil.net'
    },
    educationalLevel: mapDifficultyToEducationalLevel(difficulty),
    inLanguage: 'de',
    courseMode: 'Online',
    courseWorkload: 'PT30M', // 30 minutes per session
    numberOfCredits: 0,
    occupationalCredentialAwarded: false,
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'Online',
      courseWorkload: 'PT30M'
    }
  };
};

export const generateFAQStructuredData = (faqs) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
};

export const generateOrganizationStructuredData = () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://papageil.net';
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'PapaGeil',
    alternateName: 'PapaGeil - Learn German',
    url: siteUrl,
    logo: `${siteUrl}/logo.jpg`,
    description: 'Interactive German language learning platform using Shadowing and Dictation methods with real YouTube videos',
    foundingDate: '2024',
    sameAs: [
      'https://twitter.com/papageil_de'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'contact@papageil.net',
      availableLanguage: ['German', 'English', 'Vietnamese']
    }
  };
};

export const generateWebSiteStructuredData = () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://papageil.net';
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'PapaGeil',
    url: siteUrl,
    description: 'Learn German with Shadowing and Dictation methods using real YouTube videos',
    inLanguage: ['de', 'en', 'vi'],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };
};


export const generatePersonStructuredData = (user) => {
  if (!user) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: user.name || user.username,
    email: user.email,
    learnsLanguage: {
      '@type': 'Language',
      name: 'German',
      alternateName: 'Deutsch'
    }
  };
};

// Helper functions
const mapDifficultyToEducationalLevel = (difficulty) => {
  const mapping = {
    'beginner': 'Beginner',
    'intermediate': 'Intermediate',
    'advanced': 'Advanced',
    'a1': 'Beginner',
    'a2': 'Elementary',
    'b1': 'Intermediate',
    'b2': 'Upper Intermediate',
    'c1': 'Advanced',
    'c2': 'Proficient'
  };
  return mapping[difficulty?.toLowerCase()] || 'All Levels';
};

const mapDifficultyToCEFR = (difficulty) => {
  const mapping = {
    'beginner': 'A1-A2',
    'intermediate': 'B1-B2',
    'advanced': 'C1-C2',
    'a1': 'A1',
    'a2': 'A2',
    'b1': 'B1',
    'b2': 'B2',
    'c1': 'C1',
    'c2': 'C2'
  };
  return mapping[difficulty?.toLowerCase()] || 'A1-C2';
};

export default SEO;
