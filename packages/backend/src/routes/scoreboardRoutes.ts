import { Router } from 'express';
import { 
  getActiveEvents, 
  getLeaderboard, 
  getScoreProgressionChart, 
  getEventStats,
  handleSshEvent,
  getSshTeams
} from '../controllers/scoreboardController.ts';
import { optionalAuthenticate } from '../middlewares/auth.ts';
import { sshEventLimiter } from '../middlewares/rateLimit.ts';

const router = Router();

router.use(optionalAuthenticate);

router.get('/events', getActiveEvents);
router.get('/events/:id/stats', getEventStats);
router.get('/', getLeaderboard);
router.get('/chart', getScoreProgressionChart);
router.get('/ssh-teams', sshEventLimiter, getSshTeams);
router.post('/ssh-event', sshEventLimiter, handleSshEvent);

export default router;
