<template>
  <view class="login-page">
    <view class="login-header">
      <text class="app-icon">🍽️</text>
      <text class="app-title">欢迎登录</text>
      <text class="app-subtitle">手机网页点餐系统</text>
    </view>

    <view class="login-form">
      <view class="input-group">
        <text class="input-icon">👤</text>
        <input
          v-model="username"
          class="input"
          type="text"
          placeholder="请输入用户名"
          placeholder-class="placeholder"
        />
      </view>
      <view class="input-group">
        <text class="input-icon">🔒</text>
        <input
          v-model="password"
          class="input"
          type="password"
          placeholder="请输入密码"
          placeholder-class="placeholder"
        />
      </view>
      <button class="login-btn" @click="handleLogin">登录</button>
      <text class="login-tip">管理员：lsy / password；用户：zy / password</text>
    </view>
  </view>
</template>

<script>
import { login } from '@/api/foods.js'

export default {
  data() {
    return {
      username: '',
      password: '',
    }
  },
  methods: {
    async handleLogin() {
      if (!this.username.trim()) {
        uni.showToast({ title: '请输入用户名', icon: 'none' })
        return
      }
      if (!this.password.trim()) {
        uni.showToast({ title: '请输入密码', icon: 'none' })
        return
      }
      try {
        const user = await login({
          username: this.username.trim(),
          password: this.password,
        })
        uni.setStorageSync('token', user.token)
        uni.setStorageSync('user', user)
        uni.reLaunch({ url: '/pages/home/home' })
      } catch (error) {
        uni.showToast({ title: error.message || '登录失败', icon: 'none' })
      }
    },
  },
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #ff8a80 0%, #ffab91 40%, #f5f5f5 40%);
  padding: 0 60rpx;
  box-sizing: border-box;
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 180rpx;
  padding-bottom: 80rpx;
}

.app-icon {
  font-size: 100rpx;
  margin-bottom: 30rpx;
}

.app-title {
  font-size: 48rpx;
  font-weight: 600;
  color: #fff;
  margin-bottom: 16rpx;
}

.app-subtitle {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.85);
}

.login-form {
  background: #fff;
  border-radius: 24rpx;
  padding: 60rpx 40rpx;
  box-shadow: 0 8rpx 40rpx rgba(0, 0, 0, 0.08);
}

.input-group {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 16rpx;
  padding: 0 30rpx;
  margin-bottom: 30rpx;
  height: 96rpx;
}

.input-icon {
  font-size: 36rpx;
  margin-right: 20rpx;
}

.input {
  flex: 1;
  font-size: 30rpx;
  color: #333;
  height: 96rpx;
}

.placeholder {
  color: #bbb;
}

.login-btn {
  margin-top: 20rpx;
  background: linear-gradient(135deg, #ff6b6b, #ff8a80);
  color: #fff;
  font-size: 34rpx;
  font-weight: 500;
  border-radius: 48rpx;
  height: 96rpx;
  line-height: 96rpx;
  border: none;
}

.login-btn::after {
  border: none;
}

.login-tip {
  display: block;
  margin-top: 28rpx;
  text-align: center;
  font-size: 24rpx;
  color: #999;
}
</style>
