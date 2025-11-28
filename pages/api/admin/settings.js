import connectDB from '../../../lib/mongodb';
import SystemSettings from '../../../models/SystemSettings';
import { verifyToken } from '../../../lib/jwt';

export default async function handler(req, res) {
  try {
    await connectDB();

    // Verify authentication and admin role
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Zugriff verweigert. Nur Administratoren haben Zugriff.' });
    }

    // GET - Fetch system settings
    if (req.method === 'GET') {
      const settings = await SystemSettings.getSettings();
      return res.status(200).json(settings);
    }

    // PUT - Update system settings
    if (req.method === 'PUT') {
      const updates = req.body;
      
      // Security: Don't allow updating _id or __v
      delete updates._id;
      delete updates.__v;
      
      const settings = await SystemSettings.updateSettings(updates, decoded.userId);
      return res.status(200).json({ 
        success: true, 
        message: 'Einstellungen erfolgreich aktualisiert',
        settings 
      });
    }

    return res.status(405).json({ error: 'Methode nicht erlaubt' });
  } catch (error) {
    console.error('Settings API error:', error);
    return res.status(500).json({ error: 'Serverfehler beim Verarbeiten der Einstellungen' });
  }
}
