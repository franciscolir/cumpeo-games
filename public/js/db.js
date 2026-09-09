const API = '/api';

export const db = {
  async listGames() {
    const res = await fetch(`${API}/games`);
    return res.json();
  },
  async createGame(data) {
    await fetch(`${API}/games`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
  },
  async getState() {
    const res = await fetch(`${API}/state`);
    return res.json();
  },
  async setState(data) {
    await fetch(`${API}/state`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
  }
};
