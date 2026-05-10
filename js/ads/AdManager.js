// 替换为微信公众平台获取的真实广告单元 ID
const AD_UNITS = {
  rewarded: 'adunit-xxxxxxxx',
  banner: 'adunit-yyyyyyyy',
};

// 开发模拟模式：跳过真实广告 API，直接发放奖励（发布时改为 false）
const DEV_MODE = true;

export class AdManager {
  constructor() {
    this.rewardedVideoAd = null;
    this.bannerAd = null;
    this.pendingReward = null;
    this.onRewardCallback = null;
  }

  init() {
    if (DEV_MODE) {
      console.log('[Ad] 开发模式：广告模拟已启用，点击广告按钮直接发放奖励');
      return;
    }

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
    this.pendingReward = type;
    this.onRewardCallback = cb || null;

    // 开发模拟模式：跳过真实广告，直接发奖励
    if (DEV_MODE) {
      GameGlobal.databus.showToast('模拟广告观看中...');
      setTimeout(() => this._grantReward(), 800);
      return;
    }

    if (!this.rewardedVideoAd) {
      GameGlobal.databus.showToast('广告功能暂不可用');
      return;
    }
    this.rewardedVideoAd.show().catch(() => {
      this.rewardedVideoAd.load().then(() => this.rewardedVideoAd.show()).catch(() => {
        GameGlobal.databus.showToast('广告加载失败，请稍后再试');
      });
    });
  }

  _grantReward() {
    const db = GameGlobal.databus;
    const api = GameGlobal.main.api;

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
    if (DEV_MODE) return;
    if (this.bannerAd) {
      this.bannerAd.show().catch(() => {});
    }
  }

  hideBanner() {
    if (DEV_MODE) return;
    if (this.bannerAd) {
      this.bannerAd.hide().catch(() => {});
    }
  }

  destroy() {
    if (this.rewardedVideoAd) this.rewardedVideoAd.destroy();
    if (this.bannerAd) this.bannerAd.destroy();
  }
}
