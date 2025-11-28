const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://papageil.net';

function generateSiteMap(lessons) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- Homepage -->
  <url>
    <loc>${SITE_URL}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Auth pages -->
  <url>
    <loc>${SITE_URL}/auth/login</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${SITE_URL}/auth/register</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>

  <!-- Dashboard (logged-in users) -->
  <url>
    <loc>${SITE_URL}/dashboard</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Dynamic lesson pages -->
  ${lessons
    .map((lesson) => {
      const lessonLastMod = lesson.updatedAt || lesson.createdAt || new Date().toISOString();
      return `
  <!-- Lesson: ${lesson.title || lesson.id} -->
  <url>
    <loc>${SITE_URL}/shadowing/${lesson.id}</loc>
    <lastmod>${new Date(lessonLastMod).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    ${lesson.thumbnail ? `
    <image:image>
      <image:loc>${lesson.thumbnail}</image:loc>
      <image:title>${lesson.title || 'PapaGeil - Deutsch Lernen Lektion'}</image:title>
    </image:image>` : ''}
  </url>
  <url>
    <loc>${SITE_URL}/dictation/${lesson.id}</loc>
    <lastmod>${new Date(lessonLastMod).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    ${lesson.thumbnail ? `
    <image:image>
      <image:loc>${lesson.thumbnail}</image:loc>
      <image:title>${lesson.title || 'Deutsch Dictation Lesson'}</image:title>
    </image:image>` : ''}
  </url>`;
    })
    .join('')}
</urlset>`;
}

export async function getServerSideProps({ res }) {
  try {
    // Fetch lessons from your API/database
    // Using the same approach as your index.js page
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/lessons`);

    let lessons = [];
    if (response.ok) {
      const data = await response.json();
      // Handle both old array format and new object format
      lessons = Array.isArray(data) ? data : (data.lessons || []);
    }

    // Generate the XML sitemap
    const sitemap = generateSiteMap(lessons);

    // Set response headers
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate');

    // Write the sitemap
    res.write(sitemap);
    res.end();

    return {
      props: {},
    };
  } catch (error) {
    console.error('Error generating sitemap:', error);

    // Return a minimal sitemap on error
    const minimalSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>`;

    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.write(minimalSitemap);
    res.end();

    return {
      props: {},
    };
  }
}

// Default export to prevent Next.js errors
export default function Sitemap() {
  return null;
}
