import connectDB from '../../../lib/mongodb';
import SystemSettings from '../../../models/SystemSettings';

export default async function handler(req, res) {
  try {
    await connectDB();

    // GET - Fetch public settings (no auth required)
    if (req.method === 'GET') {
      const settings = await SystemSettings.getSettings();
      
      // Only return public settings
      const publicSettings = {
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        facebookUrl: settings.facebookUrl,
        twitterUrl: settings.twitterUrl,
        instagramUrl: settings.instagramUrl,
        youtubeUrl: settings.youtubeUrl,
        tiktokUrl: settings.tiktokUrl,
        linkedinUrl: settings.linkedinUrl,
        githubUrl: settings.githubUrl,
        logoUrl: settings.logoUrl,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        showFooter: settings.showFooter
      };
      
      return res.status(200).json(publicSettings);
    }

    return res.status(405).json({ error: 'Methode nicht erlaubt' });
  } catch (error) {
    console.error('Public settings API error:', error);
    return res.status(500).json({ error: 'Serverfehler beim Laden der Einstellungen' });
  }
}
