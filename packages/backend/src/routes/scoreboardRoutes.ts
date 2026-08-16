import { Router } from 'express';
import { getLeaderboard, getScoreProgressionChart, getActiveEvents, getEventStats } from '../controllers/scoreboardController.ts';

const router = Router();

router.get('/events', getActiveEvents);
router.get('/events/:id/stats', getEventStats);
router.get('/', getLeaderboard);
router.get('/chart', getScoreProgressionChart);

export default router;
