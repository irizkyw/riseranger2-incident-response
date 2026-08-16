import { Router } from 'express';
import { 
  listChallenges, 
  getChallengeDetail, 
  unlockHint, 
  submitFlag,
  trackChallengeSession,
  challengeHeartbeat 
} from '../controllers/challengeController.ts';
import { authenticate } from '../middlewares/auth.ts';
import { flagSubmissionLimiter } from '../middlewares/rateLimit.ts';
import { validate, submitFlagSchema } from '../middlewares/validator.ts';

const router = Router();

router.get('/', authenticate, listChallenges);
router.get('/:id', authenticate, getChallengeDetail);
router.post('/:id/track-session', authenticate, trackChallengeSession);
router.post('/:id/heartbeat', authenticate, challengeHeartbeat);
router.post('/:id/hint', authenticate, unlockHint);
router.post('/submit', authenticate, flagSubmissionLimiter, validate(submitFlagSchema), submitFlag);

export default router;
