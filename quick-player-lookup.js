require('dotenv').config();
const https = require('https');

const CLIENT_KEY = process.env.NFL_CLIENT_KEY || 'VhcsgwovwvCiN3xrl5UPippxjaMBOwqk';
const CLIENT_SECRET = process.env.NFL_CLIENT_SECRET || '9giQIDN3gmlaKjbL';

let cachedToken = null;
let tokenExpiry = null;

// Get OAuth token from NFL Identity API
function getToken() {
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
        return Promise.resolve(cachedToken);
    }

    const postData = JSON.stringify({
        clientKey: CLIENT_KEY,
        clientSecret: CLIENT_SECRET
    });

    const options = {
        hostname: 'api.nfl.com',
        path: '/identity/v3/token',
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Authorization': CLIENT_KEY,
            'Content-Type': 'application/json',
            'Content-Length': postData.length
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const parsed = JSON.parse(data);
                        cachedToken = parsed.accessToken;
                        tokenExpiry = parsed.expiresIn * 1000;
                        resolve(cachedToken);
                    } catch (error) {
                        reject(new Error('Failed to parse token response'));
                    }
                } else {
                    reject(new Error(`Token request failed with status ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Fetch injuries from NFL API
async function fetchInjuries(season = 2024, seasonType = 'REG') {
    const token = await getToken();
    
    const options = {
        hostname: 'api.nfl.com',
        path: `/football/v2/injuries?season=${season}&seasonType=${seasonType}`,
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    return new Promise((resolve, reject) => {
        https.get(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(new Error('Failed to parse injuries'));
                    }
                } else {
                    reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
                }
            });
        }).on('error', reject);
    });
}

// Search for player in injury report
async function searchPlayer(playerName) {
    console.log(`Searching for ${playerName} in NFL injury report...\n`);

    try {
        const data = await fetchInjuries();
        
        if (!data.injuries || !Array.isArray(data.injuries)) {
            console.log('No injury data available');
            return;
        }

        const matches = data.injuries.filter(injury => {
            const displayName = injury.person?.displayName || '';
            return displayName.toLowerCase().includes(playerName.toLowerCase());
        });

        if (matches.length === 0) {
            console.log(`Player not found in injury report: ${playerName}`);
            console.log('(This may mean the player is healthy)');
            return;
        }

        // Display player info for each match
        matches.forEach((injury, index) => {
            if (index > 0) console.log('\n' + '-'.repeat(50) + '\n');
            
            console.log(`=== ${injury.person?.displayName} ===\n`);
            console.log(`Team: ${injury.team?.fullName}`);
            console.log(`Position: ${injury.position}`);
            console.log(`Injury: ${injury.injuries?.join(', ') || 'N/A'}`);
            console.log(`Status: ${injury.injuryStatus || 'N/A'}`);
            
            if (injury.practiceStatus) {
                const practiceMap = {
                    'FULL': '✅ Full Practice',
                    'LIMITED': '⚠️  Limited Practice',
                    'DIDNOT': '❌ Did Not Practice'
                };
                const practiceDisplay = practiceMap[injury.practiceStatus] || injury.practiceStatus;
                console.log(`Practice: ${practiceDisplay}`);
            }
            
            if (injury.practiceDays && injury.practiceDays.length > 0) {
                console.log(`\nPractice Report:`);
                injury.practiceDays.forEach(day => {
                    console.log(`  ${day.date}: ${day.status}`);
                });
            }
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Main
const args = process.argv.slice(2);
if (args.length < 1) {
    console.log('Usage: node quick-player-lookup.js <player-name>');
    console.log('Example: node quick-player-lookup.js "Josh Allen"');
    process.exit(1);
}

const playerName = args.join(' ');

searchPlayer(playerName);
