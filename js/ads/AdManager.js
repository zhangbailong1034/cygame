const AD_UNITS = {
  rewarded: 'adunit-xxxxxxxx',
  banner: 'adunit-yyyyyyyy',
};

export class AdManager {
  constructor() {
    this.rewardedVideoAd = null;
    this.bannerAd = null;
    this.pendingReward = null;
    this.onRewardCallback = null;
  }

  init() {
    try {
      this.rewardedVideoAd = wx.createRewardedVideoAd({ adUnitId: AD_UNITS.rewarded });
      this.rewardedVideoAd.onLoad(() => {});
      this.rewardedVideoAd.onError((err) => { console.log('[Ad] rewarded video error:', err); });
      this.rewardedVideoAd.onClose((res) => {
        if (res && res.isEnded) {
          this._grantReward();
        } else {
          GameGlobal.databus.showToast('看完广告才能获得奖励哦');
          this.pendingReward = null;
          this.onRewardCallback = null;
        }
      });
    } catch (e) { console.log('[Ad] rewarded video not supported:', e); }

    try {
      this.bannerAd = wx.createBannerAd({
        adUnitId: AD_UNITS.banner,
        style: { left: 0, top: 0, width: 300 },
      });
      this.bannerAd.onError((err) => { console.log('[Ad] banner error:', err); });
    } catch (e) { console.log('[Ad] banner not supported:', e); }
  }

  showRewarded(type, cb) {
    if (!this.rewardedVideoAd) {
      GameGlobal.databus.showToast('广告功能暂不可用');
      return;
    }
    this.pendingReward = type;
    this.onRewardCallback = cb || null;
    this.rewardedVideoAd.show().catch(() => {
      this.rewardedVideoAd.load().then(() => this.rewardedVideoAd.show()).catch(() => {
        GameGlobal.databus.showToast('广告加载失败，请稍后再试');
      });
    });
  }

  _grantReward() {
    const db = GameGlobal.databus;
    const api = require('../api/index').api;

    switch (this.pendingReward) {
      case 'stamina':
        api.recoverStamina().then(res => {
          db.stamina = res.stamina;
          db.showToast('获得 +3 体力');
          if (this.onRewardCallback) this.onRewardCallback();
        });
        break;
      case 'hint':
        db.hintCards = (db.hintCards || 0) + 1;
        db.showToast('获得 1 次免费提示');
        if (this.onRewardCallback) this.onRewardCallback();
        break;
      case 'double_score':
        if (this.onRewardCallback) this.onRewardCallback();
        break;
    }
    this.pendingReward = null;
  }

  showBanner() {
    if (this.bannerAd) {
      this.bannerAd.show().catch(() => {});
    }
  }

  hideBanner() {
    if (this.bannerAd) {
      this.bannerAd.hide().catch(() => {});
    }
  }

  destroy() {
    if (this.rewardedVideoAd) this.rewardedVideoAd.destroy();
    if (this.bannerAd) this.bannerAd.destroy();
  }
}
