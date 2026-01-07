// ==================================================
// BROKEN BROWNIE - BACKEND SERVER (THE BRAIN)
// ==================================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const geoip = require('geoip-lite');
const requestIp = require('request-ip');

const app = express();

// --- MIDDLEWARE (Updated for Big Images) ---
app.use(cors());

// INCREASE SIZE LIMIT HERE (50mb is enough for high-res photos)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- 1. DATABASE CONNECTION ---
// CORRECT VERSION: Password 'brownie123' is now inside the link
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

// --- 2. DATA BLUEPRINT (UPDATED FOR DETAILED INFO) ---
const visitSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    country: String,
    city: String,
    deviceType: String, // Mobile or Desktop
    deviceName: String, // e.g., "iPhone", "Windows 10"
    ip: String          // The Visitor's IP Address
});
const Visit = mongoose.model('Visit', visitSchema);

let localVisits = [];

// --- HELPER: Parse User Agent for Device Name ---
function getDeviceName(userAgent) {
    if (!userAgent) return 'Unknown Device';
    if (/Windows/i.test(userAgent)) return 'Windows PC';
    if (/Macintosh/i.test(userAgent)) return 'MacBook / iMac';
    if (/iPhone/i.test(userAgent)) return 'iPhone';
    if (/iPad/i.test(userAgent)) return 'iPad';
    if (/Android/i.test(userAgent)) return 'Android Device';
    if (/Linux/i.test(userAgent)) return 'Linux Machine';
    return 'Unknown Device';
}

// --- 3. ROUTES ---

// Root Check
app.get('/', (req, res) => {
    res.send(`<h1 style="color:#22c55e; font-family:sans-serif;">✅ Backend is Live</h1>`);
});

// TRACKING ROUTE
app.post('/api/track', async (req, res) => {
    try {
        // 1. Get IP
        const clientIp = requestIp.getClientIp(req);
        
        // 2. Get Geo Location
        const geo = geoip.lookup(clientIp) || { country: 'Unknown', city: 'Unknown' };
        
        // 3. Get Device Details
        const userAgent = req.headers['user-agent'];
        const specificDevice = getDeviceName(userAgent);
        const deviceType = req.body.device || 'Desktop'; // Fallback from frontend

        const visitData = {
            timestamp: new Date(),
            country: geo.country || 'N/A',
            city: geo.city || 'Unknown Location',
            deviceType: deviceType,
            deviceName: specificDevice,
            ip: clientIp || 'Hidden'
        };

        // 4. Save Data
        if (isMongoConnected) {
            await Visit.create(visitData);
        } else {
            localVisits.push(visitData);
        }

        console.log(`🔔 New Visit: ${visitData.ip} - ${visitData.city} (${visitData.deviceName})`);
        res.json({ status: 'tracked' });
        
    } catch (error) {
        console.error("Tracking Error:", error);
        res.status(500).json({ error: "Tracking failed" });
    }
});

// ADMIN ROUTE
app.post('/api/admin/stats', async (req, res) => {
    const { password } = req.body;
    
    if (password !== 'brownie123') {
        return res.status(403).json({ error: "Access Denied" });
    }

    let data = [];
    if (isMongoConnected) {
        data = await Visit.find().sort({ timestamp: -1 });
    } else {
        data = localVisits.slice().reverse();
    }
    
    // Analytics Calculation
    const total = data.length;
    const mobile = data.filter(v => v.deviceType === 'Mobile').length;
    const desktop = total - mobile;
    const recent = data.slice(0, 50); // Send newest 50 rows

    res.json({ total, mobile, desktop, recent });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));