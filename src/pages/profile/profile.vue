<template>
  <view class="profile-page">
    <view class="profile-content">
      <text class="profile-icon">👤</text>
      <text class="profile-text">{{ user.username || '未登录' }}</text>
      <text class="profile-role">{{ user.role === 'admin' ? '管理员' : '普通用户' }}</text>
      <button class="logout-btn" @click="logout">退出登录</button>
    </view>
    <TabBar current="profile" />
  </view>
</template>

<script>
import TabBar from '@/components/TabBar/TabBar.vue'

export default {
  components: { TabBar },
  data() {
    return {
      user: {},
    }
  },
  onShow() {
    this.user = uni.getStorageSync('user') || {}
  },
  methods: {
    logout() {
      uni.removeStorageSync('token')
      uni.removeStorageSync('user')
      uni.reLaunch({ url: '/pages/login/login' })
    },
  },
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #f0f0f0;
  padding-bottom: 140rpx;
}

.profile-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 300rpx;
}

.profile-icon {
  font-size: 80rpx;
  margin-bottom: 30rpx;
}

.profile-text {
  font-size: 32rpx;
  color: #333;
  font-weight: 600;
}

.profile-role {
  font-size: 26rpx;
  color: #999;
  margin-top: 12rpx;
}

.logout-btn {
  margin-top: 40rpx;
  width: 260rpx;
  height: 78rpx;
  line-height: 78rpx;
  border-radius: 40rpx;
  background: #ff6b6b;
  color: #fff;
  font-size: 28rpx;
}
</style>
