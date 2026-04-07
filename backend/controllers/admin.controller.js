import { ManagementClient } from 'auth0/legacy';
import nodemailer from 'nodemailer';

// 1. Initialize Auth0
const auth0 = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_M2M_CLIENT_ID,
  clientSecret: process.env.AUTH0_M2M_CLIENT_SECRET,
});

// 2. Initialize the Email Transporter (Architect V2)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // ARCHITECT FIX: Do NOT use service: 'gmail'
  port: 587,              // Use 587 (more reliable locally)
  secure: false,          // Must be false for 587 (upgrades via STARTTLS)
  requireTLS: true,       // Force TLS security
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 15000, 
  // 👇 This will now actually work because 'service' is removed 👇
  family: 4 
});

// Get all users
export const getPendingUsers = async (req, res) => {
  try {
    // We use users.getAll() - it's the most compatible
    const response = await auth0.users.getAll({
      q: 'email:*@vpc.com.ng',
      search_engine: 'v3'
    });

    // DEFENSIVE CHECK: Handle both V4 (array) and V5 (response.data object)
    const usersArray = Array.isArray(response) ? response : (response.data || []);

    console.log(`Successfully fetched ${usersArray.length} VPC users.`);
    
    res.status(200).json({ 
      success: true, 
      users: usersArray 
    });
  } catch (error) {
    console.error("Fetch Users Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch user directory." });
  }
};

// Approve User
export const approveUser = async (req, res) => {
  const { email, userId } = req.body;

  try {
    // 1. Give the "Authorized" badge (app_metadata)
    await auth0.users.update(
      { id: userId }, 
      { app_metadata: { is_approved: true } }
    );

    // 2. Generate the Password Setup Link
    const ticketResponse = await auth0.tickets.changePassword({
      user_id: userId,
      result_url: process.env.FRONTEND_URL || 'http://localhost:5173',
      ttl_sec: 259200, // 3 days
    });

    // Defensive check for ticket data
    const inviteUrl = ticketResponse.data ? ticketResponse.data.ticket : ticketResponse.ticket;

    // 3. Send the Approval Email
    const mailOptions = {
      from: `"WatchTower Admin" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Access Approved - Setup Your WatchTower Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #1e293b; margin-bottom: 5px;">Welcome to WatchTower! 🚛</h2>
          <p style="color: #475569;">Your account request has been approved.</p>
          <div style="text-align: center; margin: 35px 0;">
            <a href="${inviteUrl}" style="background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Set Up My Account</a>
          </div>
          <p style="color: #94a3b8; font-size: 12px;">WatchTower Fleet Reporting System - Authorized Personnel Only.</p>
        </div>
      `
    };

    // 4. Try to send the email
    try {
      await transporter.sendMail(mailOptions);
      res.status(200).json({ success: true, message: `Approved and emailed ${email}.` });
    } catch (emailError) {
      console.error("Email failed to send, but user is approved in Auth0:", emailError);
      res.status(200).json({ 
        success: true, 
        message: `User approved in Auth0, but the welcome email failed to send. Setup link: ${inviteUrl}` 
      });
    }

  } catch (error) {
    console.error("Approval Error:", error);
    res.status(500).json({ success: false, message: "Error during approval." });
  }
};

// Reject User
export const rejectUser = async (req, res) => {
  const { userId } = req.body;
  try {
    await auth0.users.delete({ id: userId });
    res.status(200).json({ success: true, message: "User removed." });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ success: false, message: "Error deleting user." });
  }
};

// Invite User (Admin Direct Add)
export const inviteUser = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        console.log(`Initiating invite for: ${email}`);

        // 1. Generate a secure, random temporary password
        // The user will be forced to change this via the ticket link anyway.
        const tempPassword = Math.random().toString(36).slice(-12) + "A!1@a";

        // 2. Create the user in the Auth0 Database
        const newUserResponse = await auth0.users.create({
            email: email,
            password: tempPassword,
            connection: 'Username-Password-Authentication', // Must match your Auth0 DB name
            email_verified: true, // Pre-verify so they don't get two emails
            app_metadata: { is_approved: true } // Pre-approve them so they bypass the pending queue
        });

        // Defensive parsing for different SDK versions
        const newUser = newUserResponse.data || newUserResponse;
        const userId = newUser.user_id;

        // 3. Generate a Password Setup Ticket
        const ticketResponse = await auth0.tickets.changePassword({
            user_id: userId,
            result_url: process.env.FRONTEND_URL || 'http://localhost:5173',
            ttl_sec: 259200, // 3 days valid
            mark_email_as_verified: true
        });

        const inviteUrl = ticketResponse.data ? ticketResponse.data.ticket : ticketResponse.ticket;

        // 4. Send the Invitation Email
        const mailOptions = {
            from: `"WatchTower Admin" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'You have been invited to WatchTower',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <h2 style="color: #1e293b; margin-bottom: 5px;">Welcome to WatchTower! 🚛</h2>
                <p style="color: #475569;">An administrator has created an account for you to access the Enterprise Fleet Intelligence dashboard.</p>
                <div style="text-align: center; margin: 35px 0;">
                  <a href="${inviteUrl}" style="background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Accept Invite & Setup Password</a>
                </div>
                <p style="color: #94a3b8; font-size: 12px;">This link expires in 72 hours. WatchTower Fleet Reporting System - Authorized Personnel Only.</p>
              </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            res.status(200).json({ success: true, message: `Invitation sent to ${email}` });
        } catch (emailError) {
            console.error("Invite email failed to send:", emailError);
            res.status(200).json({ 
                success: true, 
                message: `User created, but email failed (Render Port issue). Setup link: ${inviteUrl}` 
            });
        }

    } catch (error) {
        console.error("Error inviting user:", error);
        
        // Handle specific case where the user already exists in Auth0
        if (error.statusCode === 409 || (error.message && error.message.includes('user already exists'))) {
            return res.status(409).json({ success: false, message: "User already exists in the system." });
        }
        
        res.status(500).json({ success: false, message: "Failed to invite user via Auth0." });
    }
};