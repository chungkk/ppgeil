import connectDB from '../../../lib/mongodb';
import PageContent from '../../../models/PageContent';
import { verifyToken } from '../../../lib/jwt';

export default async function handler(req, res) {
  try {
    await connectDB();

    // GET - Fetch all pages (admin only)
    if (req.method === 'GET') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Nicht autorisiert' });
      }

      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      if (!decoded || decoded.role !== 'admin') {
        return res.status(403).json({ error: 'Zugriff verweigert. Nur Administratoren haben Zugriff.' });
      }

      const pages = await PageContent.find().sort({ pageId: 1 });
      
      // Ensure all pages exist
      const pageIds = ['privacy', 'about', 'terms', 'contact'];
      const existingPageIds = pages.map(p => p.pageId);
      const missingPageIds = pageIds.filter(id => !existingPageIds.includes(id));
      
      for (const pageId of missingPageIds) {
        const page = await PageContent.getPageContent(pageId);
        pages.push(page);
      }
      
      return res.status(200).json(pages);
    }

    return res.status(405).json({ error: 'Methode nicht erlaubt' });
  } catch (error) {
    console.error('Page content API error:', error);
    return res.status(500).json({ error: 'Serverfehler beim Verarbeiten der Seiteninhalte' });
  }
}
