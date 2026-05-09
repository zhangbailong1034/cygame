const BASE_URL = 'http://localhost:3000/api';

let token = null;

function setToken(t) { token = t; }
function getToken() { return token; }

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + path,
      method,
      header: { 'Authorization': 'Bearer ' + (token || 'anonymous'), 'Content-Type': 'application/json' },
      data: data || {},
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res.data);
        }
      },
      fail(err) { reject(err); },
    });
  });
}

export const api = {
  login: (openId) => request('POST', '/auth/login', { openId }),
  getMe: () => request('GET', '/user/me'),
  recoverStamina: () => request('POST', '/user/recover-stamina'),
  dailySign: () => request('POST', '/user/daily-sign'),
  getLevels: () => request('GET', '/levels'),
  getLevelData: (levelId) => request('GET', '/levels/' + levelId),
  placeFragment: (levelId, fragmentText, positions) =>
    request('POST', '/game/place-fragment', { levelId, fragmentText, positions }),
  useHint: (levelId, row, col, hintType) =>
    request('POST', '/game/hint', { levelId, row, col, hintType }),
  resetLevel: (levelId) =>
    request('POST', '/game/reset', { levelId }),
  shareReward: () => request('POST', '/game/share-reward'),
  saveLevel: (data) => request('POST', '/editor/save', data),
  deleteLevel: (levelId) => request('DELETE', '/editor/' + levelId),
  getLeaderboard: () => request('GET', '/leaderboard'),
  setToken,
  getToken,
};
