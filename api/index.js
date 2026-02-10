// Main API endpoint - handles all email operations
const cors = require('cors');
const express = require('express');

const app = express();
app.use(cors());
app.use(express.json());

// Mail.tm API wrapper
const MAIL_TM_API = 'https://api.mail.tm';

// Generate new email
app.get('/generate', async (req, res) => {
  try {
    // Get available domain
    const domainRes = await fetch(`${MAIL_TM_API}/domains`);
    const domains = await domainRes.json();
    const domain = domains['hydra:member'][0].domain;
    
    // Generate credentials
    const username = Math.random().toString(36).substring(2, 14);
    const email = `${username}@${domain}`;
    const password = Math.random().toString(36).substring(2, 18);
    
    // Create account
    const createRes = await fetch(`${MAIL_TM_API}/accounts`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({address: email, password})
    });
    
    if (!createRes.ok) {
      throw new Error('Failed to create account');
    }
    
    const account = await createRes.json();
    
    // Get auth token
    const tokenRes = await fetch(`${MAIL_TM_API}/token`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({address: email, password})
    });
    
    const tokenData = await tokenRes.json();
    
    res.json({
      success: true,
      email: email,
      password: password,
      token: tokenData.token,
      accountId: account.id
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check inbox
app.get('/inbox', async (req, res) => {
  try {
    const { token } = req.query;
    
    const messagesRes = await fetch(`${MAIL_TM_API}/messages`, {
      headers: {'Authorization': `Bearer ${token}`}
    });
    
    const messages = await messagesRes.json();
    const emails = [];
    
    for (const msg of messages['hydra:member'] || []) {
      const detailRes = await fetch(`${MAIL_TM_API}/messages/${msg.id}`, {
        headers: {'Authorization': `Bearer ${token}`}
      });
      const detail = await detailRes.json();
      
      emails.push({
        id: msg.id,
        from: msg.from.address,
        name: msg.from.name || msg.from.address.split('@')[0],
        subject: msg.subject,
        preview: msg.intro || '',
        body: detail.text || detail.html || 'No content',
        html: detail.html || '',
        date: msg.createdAt,
        seen: msg.seen
      });
    }
    
    res.json({
      success: true,
      emails: emails
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete account
app.delete('/delete', async (req, res) => {
  try {
    const { token, accountId } = req.query;
    
    await fetch(`${MAIL_TM_API}/accounts/${accountId}`, {
      method: 'DELETE',
      headers: {'Authorization': `Bearer ${token}`}
    });
    
    res.json({success: true});
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = app;
