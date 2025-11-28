import connectDB from '../../lib/mongodb';
import SystemSettings from '../../models/SystemSettings';

// Public API endpoint - no authentication required
export default async function handler(req, res) {
  try {
    await connectDB();

    // GET - Fetch public system settings
    if (req.method === 'GET') {
      const settings = await SystemSettings.getSettings();
      
      // Return only public/safe settings (not API keys, passwords, etc.)
      const publicSettings = {
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        defaultTheme: settings.defaultTheme || 'light',
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        accentColor: settings.accentColor,
        backgroundColor: settings.backgroundColor,
        textColor: settings.textColor,
        logoUrl: settings.logoUrl,
        faviconUrl: settings.faviconUrl,
        headerBackgroundColor: settings.headerBackgroundColor,
        footerBackgroundColor: settings.footerBackgroundColor,
        fontFamily: settings.fontFamily,
        borderRadius: settings.borderRadius,
        buttonStyle: settings.buttonStyle,
        showLogo: settings.showLogo,
        showFooter: settings.showFooter,
        compactMode: settings.compactMode,
        customCSS: settings.customCSS,
        customHeaderHTML: settings.customHeaderHTML,
        customFooterHTML: settings.customFooterHTML,
        enableGoogleTranslate: settings.enableGoogleTranslate,
        enableDictionary: settings.enableDictionary,
        enableLeaderboard: settings.enableLeaderboard,
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
        facebookUrl: settings.facebookUrl,
        twitterUrl: settings.twitterUrl,
        instagramUrl: settings.instagramUrl
      };
      
      return res.status(200).json(publicSettings);
    }

    return res.status(405).json({ error: 'Methode nicht erlaubt' });
  } catch (error) {
    console.error('Settings API error:', error);
    return res.status(500).json({ error: 'Serverfehler' });
  }
}
