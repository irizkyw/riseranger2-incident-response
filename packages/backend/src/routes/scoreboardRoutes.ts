import { Router } from 'express';
import { getLeaderboard, getScoreProgressionChart, getActiveEvents } from '../controllers/scoreboardController.ts';

const router = Router();

router.get('/events', getActiveEvents);
router.get('/', getLeaderboard);
router.get('/chart', getScoreProgressionChart);

export default router;
