import connectDB from '../../../lib/mongodb';
import PageContent from '../../../models/PageContent';
import { verifyToken } from '../../../lib/jwt';

export default async function handler(req, res) {
  try {
    await connectDB();

    const { pageId } = req.query;

    if (!['privacy', 'about', 'terms', 'contact'].includes(pageId)) {
      return res.status(400).json({ error: 'Ungültige Seiten-ID' });
    }

    // GET - Fetch page content (public)
    if (req.method === 'GET') {
      const page = await PageContent.getPageContent(pageId);
      
      if (!page.isPublished) {
        return res.status(404).json({ error: 'Seite nicht gefunden' });
      }
      
      return res.status(200).json(page);
    }

    // PUT - Update page content (admin only)
    if (req.method === 'PUT') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Nicht autorisiert' });
      }

      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      if (!decoded || decoded.role !== 'admin') {
        return res.status(403).json({ error: 'Zugriff verweigert. Nur Administratoren haben Zugriff.' });
      }

      const updates = req.body;
      delete updates._id;
      delete updates.__v;
      delete updates.pageId; // Don't allow changing pageId

      const page = await PageContent.updatePageContent(pageId, updates, decoded.userId);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Seiteninhalt erfolgreich aktualisiert',
        page 
      });
    }

    return res.status(405).json({ error: 'Methode nicht erlaubt' });
  } catch (error) {
    console.error('Page content API error:', error);
    return res.status(500).json({ error: 'Serverfehler beim Verarbeiten des Seiteninhalts' });
  }
}
