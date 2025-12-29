const https = require('https');

/**
 * RosterSyncService - Syncs ALL active NFL players from official NFL API
 *
 * Uses NFL Official API to fetch complete roster data for all 32 teams
 * No rate limits - we have full access to the NFL API
 */
class RosterSyncService {
    constructor() {
        this.CLIENT_KEY = process.env.NFL_CLIENT_KEY || 'VhcsgwovwvCiN3xrl5UPippxjaMBOwqk';
        this.CLIENT_SECRET = process.env.NFL_CLIENT_SECRET || '9giQIDN3gmlaKjbL';
        this.cachedToken = null;
        this.tokenExpiry = null;

        // NFL Team abbreviations (all 32 teams)
        this.NFL_TEAMS = [
            'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
            'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
            'LV', 'LAC', 'LAR', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
            'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB', 'TEN', 'WAS'
        ];

        // High-priority positions (for smart queue)
        this.HIGH_PRIORITY_POSITIONS = ['QB', 'RB', 'WR', 'TE'];
    }

    // Get OAuth token from NFL Identity API
    async getToken() {
        if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.cachedToken;
        }

        const postData = JSON.stringify({
            clientKey: this.CLIENT_KEY,
            clientSecret: this.CLIENT_SECRET
        });

        const options = {
            hostname: 'api.nfl.com',
            path: '/identity/v3/token',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Authorization': this.CLIENT_KEY,
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
                            this.cachedToken = parsed.accessToken;
                            this.tokenExpiry = Date.now() + (parsed.expiresIn * 1000);
                            resolve(this.cachedToken);
                        } catch (error) {
                            reject(new Error('Failed to parse token response'));
                        }
                    } else {
                        reject(new Error(`Token request failed: ${res.statusCode}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }

    /**
     * Fetch roster for a specific team
     */
    async fetchTeamRoster(teamAbbr, season = 2024) {
        const token = await this.getToken();

        const options = {
            hostname: 'api.nfl.com',
            path: `/football/v2/teams/${teamAbbr}/roster?season=${season}`,
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
                            const parsed = JSON.parse(data);
                            resolve(parsed.roster || []);
                        } catch (error) {
                            reject(new Error(`Failed to parse roster for ${teamAbbr}`));
                        }
                    } else {
                        // Don't fail completely on individual team errors
                        console.warn(`⚠️  Failed to fetch ${teamAbbr} roster: ${res.statusCode}`);
                        resolve([]);
                    }
                });
            }).on('error', (error) => {
                console.warn(`⚠️  Network error fetching ${teamAbbr}:`, error.message);
                resolve([]);
            });
        });
    }

    /**
     * Fetch ALL players from ALL teams
     * This is the main method that syncs the entire league
     */
    async fetchAllPlayers(season = 2024) {
        console.log('🏈 Starting NFL roster sync...');
        console.log(`📊 Fetching rosters for ${this.NFL_TEAMS.length} teams`);

        const allPlayers = [];
        let teamsProcessed = 0;

        // Fetch rosters in batches of 8 teams (to be polite, even though we have no rate limit)
        const batchSize = 8;
        for (let i = 0; i < this.NFL_TEAMS.length; i += batchSize) {
            const batch = this.NFL_TEAMS.slice(i, i + batchSize);

            const batchPromises = batch.map(async (team) => {
                try {
                    const roster = await this.fetchTeamRoster(team, season);
                    const players = this.parseRoster(roster, team);
                    teamsProcessed++;
                    console.log(`  ✅ ${team}: ${players.length} players (${teamsProcessed}/${this.NFL_TEAMS.length})`);
                    return players;
                } catch (error) {
                    console.error(`  ❌ ${team} failed:`, error.message);
                    return [];
                }
            });

            const batchResults = await Promise.all(batchPromises);
            batchResults.forEach(players => allPlayers.push(...players));

            // Small delay between batches (100ms) just to be polite
            if (i + batchSize < this.NFL_TEAMS.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        console.log(`\n✅ Roster sync complete: ${allPlayers.length} total players`);
        return allPlayers;
    }

    /**
     * Parse roster data and normalize it
     */
    parseRoster(roster, team) {
        if (!Array.isArray(roster)) return [];

        return roster.map(player => {
            const position = this.normalizePosition(player.position);
            const isStarter = this.determineStarterStatus(player, position);

            return {
                nfl_id: player.person?.id || `${team}-${player.person?.displayName?.replace(/\s+/g, '-')}`,
                name: player.person?.displayName || 'Unknown',
                team: team,
                position: position,
                status: player.status || 'ACT',
                is_starter: isStarter,
                jersey_number: player.jerseyNumber,
                raw_data: {
                    experience: player.experience,
                    college: player.person?.collegeNames?.[0],
                    height: player.person?.height,
                    weight: player.person?.weight
                }
            };
        });
    }

    /**
     * Normalize position names (NFL API can have variations)
     */
    normalizePosition(position) {
        if (!position) return 'UNK';

        const pos = position.toUpperCase();

        // Map variations to standard positions
        const positionMap = {
            'HB': 'RB',
            'FB': 'RB',
            'SLWR': 'WR',
            'FLANKER': 'WR',
            'SLOT': 'WR',
            'ILB': 'LB',
            'OLB': 'LB',
            'MLB': 'LB',
            'CB': 'DB',
            'S': 'DB',
            'FS': 'DB',
            'SS': 'DB'
        };

        return positionMap[pos] || pos;
    }

    /**
     * Determine if a player is likely a starter
     * (This is heuristic-based since NFL API doesn't always provide depth chart)
     */
    determineStarterStatus(player, position) {
        // If they have experience > 0 and play a skill position, likely starter or key backup
        const experience = parseInt(player.experience) || 0;
        const isSkillPosition = this.HIGH_PRIORITY_POSITIONS.includes(position);

        // Simple heuristic: experienced players in skill positions
        if (isSkillPosition && experience > 1) {
            return true;
        }

        // QB with any experience is notable
        if (position === 'QB' && experience > 0) {
            return true;
        }

        return false;
    }

    /**
     * Get summary stats from fetched players
     */
    getSyncStats(players) {
        const stats = {
            total: players.length,
            byPosition: {},
            byTeam: {},
            starters: 0,
            highPriority: 0
        };

        players.forEach(player => {
            // Count by position
            stats.byPosition[player.position] = (stats.byPosition[player.position] || 0) + 1;

            // Count by team
            stats.byTeam[player.team] = (stats.byTeam[player.team] || 0) + 1;

            // Count starters
            if (player.is_starter) {
                stats.starters++;
            }

            // Count high priority (QB, RB, WR, TE)
            if (this.HIGH_PRIORITY_POSITIONS.includes(player.position)) {
                stats.highPriority++;
            }
        });

        return stats;
    }
}

module.exports = RosterSyncService;
