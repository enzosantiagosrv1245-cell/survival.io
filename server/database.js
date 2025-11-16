const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

class DatabaseManager {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, 'survival.db'), (err) => {
      if (err) {
        console.error('Database connection error:', err);
      } else {
        console.log('Connected to SQLite database');
      }
    });
    this.initTables();
  }

  initTables() {
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          kills INTEGER DEFAULT 0,
          deaths INTEGER DEFAULT 0,
          resources_collected INTEGER DEFAULT 0,
          time_survived INTEGER DEFAULT 0,
          games_played INTEGER DEFAULT 0,
          total_score INTEGER DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS achievements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          achievement_name TEXT NOT NULL,
          unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
    });
  }

  async createUser(username, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, hashedPassword],
        function(err) {
          if (err) return reject(err);
          
          const userId = this.lastID;
          this.db.run(
            'INSERT INTO stats (user_id) VALUES (?)',
            [userId],
            (err) => {
              if (err) return reject(err);
              resolve({ id: userId, username });
            }
          );
        }
      );
    });
  }

  async authenticateUser(username, password) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        async (err, user) => {
          if (err) return reject(err);
          if (!user) return reject(new Error('User not found'));
          
          const match = await bcrypt.compare(password, user.password);
          if (!match) return reject(new Error('Invalid password'));
          
          resolve({ id: user.id, username: user.username });
        }
      );
    });
  }

  getUserStats(userId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM stats WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
  }

  updateStats(userId, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ${key} + ?`).join(', ');
    const values = [...Object.values(updates), userId];
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE stats SET ${fields} WHERE user_id = ?`,
        values,
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  getLeaderboard(limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT u.username, s.* 
         FROM stats s
         JOIN users u ON s.user_id = u.id
         ORDER BY s.total_score DESC
         LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  }

  addAchievement(userId, achievementName) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO achievements (user_id, achievement_name) VALUES (?, ?)',
        [userId, achievementName],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }
}

module.exports = DatabaseManager;