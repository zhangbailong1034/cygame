const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const authCtrl = require('../controllers/authController');
const levelCtrl = require('../controllers/levelController');
const gameCtrl = require('../controllers/gameController');
const hintCtrl = require('../controllers/hintController');
const editorCtrl = require('../controllers/editorController');
const lbCtrl = require('../controllers/leaderboardController');

router.post('/auth/login', authCtrl.login);
router.get('/user/me', auth, authCtrl.getMe);
router.post('/user/recover-stamina', auth, authCtrl.recoverStamina);
router.post('/user/daily-sign', auth, authCtrl.dailySign);

router.get('/levels', auth, levelCtrl.getLevelList);
router.get('/levels/:levelId', auth, levelCtrl.getLevelData);

router.post('/game/place-fragment', auth, gameCtrl.placeFragment);
router.post('/game/hint', auth, hintCtrl.useHint);
router.post('/game/reset', auth, gameCtrl.resetLevel);
router.post('/game/share-reward', auth, gameCtrl.shareReward);

router.post('/editor/save', auth, editorCtrl.save);
router.delete('/editor/:levelId', auth, editorCtrl.remove);

router.get('/leaderboard', auth, lbCtrl.getLeaderboard);

module.exports = router;
