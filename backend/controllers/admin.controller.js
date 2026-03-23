
import { ManagementClient } from 'auth0/legacy';
import nodemailer from 'nodemailer';

// 1. Initialize Auth0
const auth0 = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_M2M_CLIENT_ID,
  clientSecret: process.env.AUTH0_M2M_CLIENT_SECRET,
});

// 2. Initialize the Email Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com', 
  port: 465,              
  secure: true,           
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 10000, 
});

//Gett all users
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

//Approve User
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

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: `Approved and emailed ${email}.` });
  } catch (error) {
    console.error("Approval Error:", error);
    res.status(500).json({ success: false, message: "Error during approval." });
  }
};

//Reject User
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