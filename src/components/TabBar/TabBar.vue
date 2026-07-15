<template>
  <view class="tab-bar">
    <view
      v-for="item in tabs"
      :key="item.key"
      class="tab-item"
      @click="switchTab(item)"
    >
      <text class="tab-icon">{{ item.icon }}</text>
      <text class="tab-text" :class="{ active: current === item.key }">{{ item.text }}</text>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    current: {
      type: String,
      default: 'home',
    },
  },
  data() {
    return {
      tabs: [
        { key: 'home', path: '/pages/home/home', text: '首页', icon: '🏠' },
        { key: 'chat', path: '/pages/chat/chat', text: '聊天', icon: '💬' },
        { key: 'profile', path: '/pages/profile/profile', text: '我的', icon: '👤' },
      ],
    }
  },
  methods: {
    switchTab(item) {
      if (this.current === item.key) return
      uni.redirectTo({ url: item.path })
    },
  },
}
</script>

<style scoped>
.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 110rpx;
  background: #fff;
  border-top: 1rpx solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 100;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 10rpx 0;
}

.tab-icon {
  font-size: 44rpx;
  line-height: 1.2;
}

.tab-text {
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
}

.tab-text.active {
  color: #4caf50;
  font-weight: 500;
}
</style>
