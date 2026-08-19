import { Router } from 'express';
import { createTeam, joinTeam, leaveTeam, kickMember, getTeamDetails, getMyTeamHistory } from '../controllers/teamController.ts';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.ts';
import { validate, createTeamSchema, joinTeamSchema } from '../middlewares/validator.ts';

const router = Router();

router.post('/create', authenticate, validate(createTeamSchema), createTeam);
router.post('/join', authenticate, validate(joinTeamSchema), joinTeam);
router.post('/leave', authenticate, leaveTeam);
router.delete('/kick/:targetUserId', authenticate, kickMember);
router.get('/history/my', authenticate, getMyTeamHistory);
router.get('/:teamId', optionalAuthenticate, getTeamDetails);

export default router;

