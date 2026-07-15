<template>
  <view class="profile-page">
    <view class="profile-content">
      <text class="profile-icon">👤</text>
      <text class="profile-text">这里是个人中心页面</text>
    </view>
    <TabBar current="profile" />
  </view>
</template>

<script>
import TabBar from '@/components/TabBar/TabBar.vue'

export default {
  components: { TabBar },
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
  color: #999;
}
</style>
