// ==================================================
// BROKEN BROWNIE - BACKEND SERVER (THE BRAIN)
// ==================================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const geoip = require('geoip-lite');
const requestIp = require('request-ip');

const app = express();

// Middleware (Allows the website to talk to this brain)
app.use(cors());
app.use(express.json());

// --- 1. DATABASE CONNECTION ---
// I have inserted your specific URL with the password 'brownie123'
const MONGO_URI = "mongodb+srv://anmol:brownie123@cluster0.ezth9nq.mongodb.net/?appName=Cluster0";
let isMongoConnected = false;

mongoose.connect(MONGO_URI)
    .then(() => { 
        console.log("✅ MongoDB Connected (Cloud Database Active)"); 
        isMongoConnected = true; 
    })
    .catch(err => {
        console.log("⚠️ MongoDB Not Connected (Running in Memory Mode)");
        console.log("   - Error Details:", err.message);
    });

// --- 2. DATA BLUEPRINT ---
const visitSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    country: String,
    city: String,
    device: String
});
const Visit = mongoose.model('Visit', visitSchema);

// Backup memory (if database fails)
let localVisits = [];

// --- 3. ROUTES ---

// ROOT ROUTE: Fixes the "Cannot GET /" error
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
            <h1 style="color: #22c55e;">✅ Broken Brownie Backend is LIVE!</h1>
            <p>The brain is running perfectly.</p>
            <p>Do not close this window.</p>
            <hr style="width: 50%; margin: 20px auto;">
            <p style="color: #666;">Status: ${isMongoConnected ? "Connected to Cloud DB" : "Memory Mode"}</p>
        </div>
    `);
});

// TRACKING ROUTE: The website sends visitor info here
app.post('/api/track', async (req, res) => {
    try {
        const clientIp = requestIp.getClientIp(req);
        // On Localhost, IP is often ::1, so GeoIP fails. This handles that gracefully.
        const geo = geoip.lookup(clientIp) || { country: 'Unknown', city: 'Unknown' };
        const device = req.body.device || 'Desktop';

        const visitData = {
            timestamp: new Date(),
            country: geo.country || 'Unknown',
            city: geo.city || 'Unknown',
            device: device
        };

        // Save to Database OR Memory
        if (isMongoConnected) {
            await Visit.create(visitData);
        } else {
            localVisits.push(visitData);
        }

        console.log(`🔔 New Visitor: ${visitData.city} (${visitData.device})`);
        res.json({ status: 'tracked' });
        
    } catch (error) {
        console.error("Tracking Error:", error);
        res.status(500).json({ error: "Tracking failed" });
    }
});

// ADMIN ROUTE: The Dashboard asks for stats here
app.post('/api/admin/stats', async (req, res) => {
    const { password } = req.body;
    
    // 🔒 SECURITY CHECK
    if (password !== 'brownie123') {
        return res.status(403).json({ error: "Access Denied: Wrong Password" });
    }

    // Get Data
    let data = [];
    if (isMongoConnected) {
        data = await Visit.find().sort({ timestamp: -1 }); // Get all, newest first
    } else {
        data = localVisits.slice().reverse();
    }
    
    // Calculate Analytics
    const total = data.length;
    const mobile = data.filter(v => v.device === 'Mobile').length;
    const desktop = total - mobile;
    const recent = data.slice(0, 50); // Send only last 50 for the table

    res.json({ total, mobile, desktop, recent });
});

// --- 4. START THE ENGINE ---
// Use process.env.PORT for Render, or 5000 for Localhost
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`🚀 SERVER RUNNING at http://localhost:${PORT}`);
    console.log(`   - Open this URL in browser to verify status.`);
    console.log(`   - Waiting for website visitors...`);
    console.log(`=============================================`);
});