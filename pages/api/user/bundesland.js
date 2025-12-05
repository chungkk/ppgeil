import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import { verifyToken } from '../../../lib/jwt';

export default async function handler(req, res) {
  await dbConnect();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (req.method === 'GET') {
    try {
      const user = await User.findById(decoded.userId).select('bundesland lidProgress');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.status(200).json({ 
        bundesland: user.bundesland || '',
        lidProgress: user.lidProgress || { completedQuestions: [], testsTaken: 0, bestScore: 0 }
      });
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { bundesland } = req.body;
      const validCodes = ['bw', 'by', 'be', 'bb', 'hb', 'hh', 'he', 'mv', 'ni', 'nw', 'rp', 'sl', 'sn', 'st', 'sh', 'th', ''];
      
      if (!validCodes.includes(bundesland)) {
        return res.status(400).json({ error: 'Invalid bundesland code' });
      }

      const user = await User.findByIdAndUpdate(
        decoded.userId,
        { bundesland },
        { new: true }
      ).select('bundesland lidProgress');

      return res.status(200).json({ 
        bundesland: user.bundesland,
        lidProgress: user.lidProgress
      });
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
