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
  getAllUsersAdmin,
  updateUserRole,
  deleteUserAdmin,
  getAllCategoriesAdmin,
  createCategoryAdmin,
  deleteCategoryAdmin,
  getEventTokensAdmin,
  generateTokensAdmin,
  resetTokenAdmin,
  deleteTokenAdmin
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

// Stats & Logs
router.get('/stats', getAdminStats);
router.get('/logs', getSubmissionLogs);

// Events
router.get('/events', getAllEvents);
router.post('/events', createEvent);
router.put('/events/:id', updateEvent);
router.delete('/events/:id', deleteEvent);

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
router.post('/teams/:teamId/ban', toggleBanTeam);

// User Management
router.get('/users', getAllUsersAdmin);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUserAdmin);

// Category Management
router.get('/categories', getAllCategoriesAdmin);
router.post('/categories', createCategoryAdmin);
router.delete('/categories/:id', deleteCategoryAdmin);

export default router;

