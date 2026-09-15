import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let db: SQLite.SQLiteDatabase | null = null;

const DB_NAME = 'crizon_ai.db';

export type AIMessage = {
  id: number;
  role: 'user' | 'ai';
  text: string;
  createdAt: number;
};

export const AIChatDB = {
  init: async () => {
    if (db) return db;
    db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
    await db.executeSql(
      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        text TEXT NOT NULL,
        createdAt INTEGER NOT NULL
      );`
    );
    return db;
  },

  add: async (role: 'user' | 'ai', text: string) => {
    const d = await AIChatDB.init();
    await d.executeSql(
      'INSERT INTO messages (role, text, createdAt) VALUES (?, ?, ?);',
      [role, text, Date.now()]
    );
  },

  all: async (): Promise<AIMessage[]> => {
    const d = await AIChatDB.init();
    const [res] = await d.executeSql(
      'SELECT * FROM messages ORDER BY createdAt ASC;'
    );
    const out: AIMessage[] = [];
    for (let i = 0; i < res.rows.length; i++) {
      out.push(res.rows.item(i));
    }
    return out;
  },

  clear: async () => {
    const d = await AIChatDB.init();
    await d.executeSql('DELETE FROM messages;');
  },
};
