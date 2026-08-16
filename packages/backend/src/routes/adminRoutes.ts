import { Router } from 'express';
import { 
  getAdminStats, 
  getSubmissionLogs, 
  getAllEvents, 
  createEvent, 
  updateEvent, 
  deleteEvent, 
  toggleBanTeam, 
  getAllTeamsAdmin,
  getTeamDetailsAdmin,
  createTeamAdmin,
  importTeamsAdmin,
  updateTeamAdmin,
  deleteTeamAdmin,
  removeTeamMemberAdmin,
  addTeamMemberAdmin,
  getAllUsersAdmin,
  searchUsersAdmin,
  createUserAdmin,
  updateUserAdmin,
  importUsersAdmin,
  updateUserRole,
  deleteUserAdmin,
  getAllRolesAdmin,
  createRoleAdmin,
  updateRoleAdmin,
  deleteRoleAdmin,
  getAllCategoriesAdmin,
  createCategoryAdmin,
  deleteCategoryAdmin,
  getEventTokensAdmin,
  generateTokensAdmin,
  resetTokenAdmin,
  deleteTokenAdmin,
  getLiveChallengeActivity,
  toggleForceStopAttempt,
  togglePauseAttempt,
  togglePauseEvent,
  forceFinishEvent,
  toggleForceStopTeam,
  togglePauseTeam
} from '../controllers/adminController.js';

import { 
  createChallengeAdmin, 
  updateChallengeAdmin, 
  deleteChallengeAdmin, 
  getAllChallengesAdmin,
  importChallengesAdmin 
} from '../controllers/challengeController.ts';
import { authenticate, requireAdmin } from '../middlewares/auth.ts';

const router = Router();

// Protect all admin routes
router.use(authenticate, requireAdmin);

// Stats, Live Activity & Logs
router.get('/stats', getAdminStats);
router.get('/logs', getSubmissionLogs);
router.get('/live-activity', getLiveChallengeActivity);
router.put('/live-activity/:id/force-stop', toggleForceStopAttempt);
router.put('/live-activity/:id/pause', togglePauseAttempt);

// Events
router.get('/events', getAllEvents);
router.post('/events', createEvent);
router.put('/events/:id', updateEvent);
router.delete('/events/:id', deleteEvent);
router.put('/events/:id/toggle-pause', togglePauseEvent);
router.put('/events/:id/force-finish', forceFinishEvent);

// Single-Use Tokens (Tickets / Access Keys)
router.get('/tokens', getEventTokensAdmin);
router.post('/tokens/generate', generateTokensAdmin);
router.put('/tokens/:id/reset', resetTokenAdmin);
router.delete('/tokens/:id', deleteTokenAdmin);

// Challenge CRUD
router.get('/challenges', getAllChallengesAdmin);
router.post('/challenges', createChallengeAdmin);
router.put('/challenges/:id', updateChallengeAdmin);
router.delete('/challenges/:id', deleteChallengeAdmin);
router.post('/challenges/import', importChallengesAdmin);

// Team Management
router.get('/teams', getAllTeamsAdmin);
router.get('/teams/:id', getTeamDetailsAdmin);
router.post('/teams', createTeamAdmin);
router.post('/teams/import', importTeamsAdmin);
router.put('/teams/:id', updateTeamAdmin);
router.delete('/teams/:id', deleteTeamAdmin);
router.post('/teams/:teamId/ban', toggleBanTeam);
router.put('/teams/:id/force-stop', toggleForceStopTeam);
router.put('/teams/:id/pause', togglePauseTeam);
router.post('/teams/:teamId/members', addTeamMemberAdmin);
router.delete('/teams/:teamId/members/:userId', removeTeamMemberAdmin);

// User & Role Management
router.get('/users/search', searchUsersAdmin);
router.get('/users', getAllUsersAdmin);
router.post('/users', createUserAdmin);
router.put('/users/:id', updateUserAdmin);
router.post('/users/import', importUsersAdmin);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUserAdmin);
router.get('/roles', getAllRolesAdmin);
router.post('/roles', createRoleAdmin);
router.put('/roles/:id', updateRoleAdmin);
router.delete('/roles/:id', deleteRoleAdmin);

// Category Management
router.get('/categories', getAllCategoriesAdmin);
router.post('/categories', createCategoryAdmin);
router.delete('/categories/:id', deleteCategoryAdmin);

export default router;

