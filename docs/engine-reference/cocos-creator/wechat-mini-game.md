# WeChat Mini Game Development Guide

*Last verified: 2026-03-24*

This guide covers WeChat Mini Game development with Cocos Creator 3.8.8.

## Official Documentation

- [Publish to WeChat Mini Games](https://docs.cocos.com/creator/3.8/manual/en/editor/publish/publish-wechatgame.html)
- [WeChat Mini Games Engine Plugin](https://docs.cocos.com/creator/3.8/manual/en/editor/publish/wechatgame-plugin.html)
- [中文文档: 微信小游戏发布](https://docs.cocos.com/creator/3.8/manual/zh/publish/publish-wechatgame.html)

## Setup

### 1. Install WeChat DevTools

Download from: https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

### 2. Configure Cocos Creator

1. Open `Cocos Creator → Preferences → Native Development`
2. Set WeChatGame App Path to WeChat DevTools installation

### 3. Build Settings

In Cocos Creator Build panel:
- Platform: WeChat Mini Game
- AppID: Your WeChat Mini Game AppID (register at mp.weixin.qq.com)
- Use Engine Plugin: Enable (reduces package size)
- Subpackage: Configure for assets > 4MB

## Package Size Limits

| Package Type | Size Limit |
|--------------|------------|
| Main Package | 4 MB |
| Total (all subpackages) | 20 MB |
| Single Subpackage | 2 MB |

## Optimization Strategies

### 1. Use Engine Plugin

Enable "Use Engine Plugin" in build settings to share the Cocos engine across mini games, reducing your package size.

### 2. Asset Compression

- Compress textures (PNG → WebP where supported)
- Use texture atlases (Auto Atlas)
- Compress audio (MP3/OGG)

### 3. Remote Asset Loading

Load large assets from CDN instead of bundling:

```typescript
import { assetManager, ImageAsset, Texture2D, SpriteFrame } from 'cc';

// Load remote texture
assetManager.loadRemote<ImageAsset>('https://cdn.example.com/image.png', (err, imageAsset) => {
    if (err) return;
    const texture = new Texture2D();
    texture.image = imageAsset;
    const spriteFrame = new SpriteFrame();
    spriteFrame.texture = texture;
    // Use spriteFrame...
});
```

### 4. Subpackage Loading

Configure in Build panel:
- Split by scene or feature
- Load on demand

```typescript
import { assetManager } from 'cc';

// Load subpackage
assetManager.loadBundle('festival-spring', (err, bundle) => {
    if (err) return;
    bundle.load('scenes/SpringFestival', Scene, (err, scene) => {
        // Use scene...
    });
});
```

## WeChat SDK Integration

### Login

```typescript
// In WeChat environment
if (typeof wx !== 'undefined') {
    wx.login({
        success: (res) => {
            const code = res.code;
            // Send code to server for openid
        }
    });
}
```

### User Info

```typescript
wx.getUserInfo({
    success: (res) => {
        const userInfo = res.userInfo;
        // Use userInfo.nickName, userInfo.avatarUrl
    }
});
```

### Share

```typescript
// Share to friends
wx.shareAppMessage({
    title: '我在岁时记里举办了一个热闹的中秋节！',
    imageUrl: 'https://cdn.example.com/share.png',
    query: 'id=123'
});

// Share to timeline (moments)
wx.shareAppMessage({
    title: '岁时记 - 体验传统节日的美好',
    imageUrl: 'https://cdn.example.com/share-timeline.png'
});
```

### Payment (IAP)

```typescript
wx.requestPayment({
    timeStamp: '',
    nonceStr: '',
    package: '',
    signType: 'MD5',
    paySign: '',
    success: (res) => {
        // Payment success
    },
    fail: (res) => {
        // Payment failed
    }
});
```

### Rewarded Video Ads

```typescript
// Create rewarded video ad
let rewardedVideoAd = wx.createRewardedVideoAd({
    adUnitId: 'your-ad-unit-id'
});

// Show ad
rewardedVideoAd.show().catch(() => {
    // Ad not ready, load first
    rewardedVideoAd.load().then(() => rewardedVideoAd.show());
});

// Handle close
rewardedVideoAd.onClose((res) => {
    if (res && res.isEnded) {
        // User watched full ad, give reward
    } else {
        // User closed early
    }
});
```

## Cloud Save

### Option 1: WeChat Cloud Development

```typescript
// Initialize cloud
wx.cloud.init({
    env: 'your-env-id'
});

// Save data
wx.cloud.callFunction({
    name: 'saveGameData',
    data: { saveData: gameData }
});

// Load data
wx.cloud.callFunction({
    name: 'loadGameData',
    data: { userId: openid }
});
```

### Option 2: Custom Server

Use `wx.request` to communicate with your backend:

```typescript
wx.request({
    url: 'https://api.example.com/save',
    method: 'POST',
    data: { openid, saveData },
    success: (res) => {
        // Handle success
    }
});
```

## Platform Detection

```typescript
// Check if running in WeChat
const isWeChat = typeof wx !== 'undefined';

// Check platform
if (isWeChat) {
    const systemInfo = wx.getSystemInfoSync();
    console.log(systemInfo.platform); // 'ios', 'android', 'devtools'
}
```

## Testing

1. Build for WeChat Mini Game in Cocos Creator
2. Open exported project in WeChat DevTools
3. Test on simulator and real devices
4. Test network, payment, and ads functionality

## Common Issues

### Package Size Exceeded
- Use subpackages
- Move assets to CDN
- Enable engine plugin
- Compress textures and audio

### White Screen on Launch
- Check console for errors
- Verify all required assets are loaded
- Check subpackage configuration

### Touch Events Not Working
- Ensure Canvas has correct size
- Check camera settings
- Verify UI hierarchy

## Resources

- [WeChat Mini Game Docs](https://developers.weixin.qq.com/minigame/dev/guide/)
- [Cocos Creator 3.8 Docs](https://docs.cocos.com/creator/3.8/)
- [2026 Cocos Creator Tutorial (Bilibili)](https://www.bilibili.com/video/BV1xsLoz4Ebv/)
