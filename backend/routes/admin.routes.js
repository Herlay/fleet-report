import express from 'express';
import { getPendingUsers, approveUser, rejectUser, inviteUser } from '../controllers/admin.controller.js';

const router = express.Router();

// GET: Fetch all users waiting for approval
router.get('/pending-users', getPendingUsers);

// POST: Approve a user, give them the wristband, and send the setup email
router.post('/approve', approveUser);

// POST: Reject and delete an unauthorized user from Auth0
router.post('/reject', rejectUser);

//invite user
router.post('/invite', inviteUser); 

export default router;