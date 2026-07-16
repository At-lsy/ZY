<template>
  <view class="home-page">
    <view class="banner-section">
      <swiper
        class="banner-swiper"
        :indicator-dots="true"
        :autoplay="true"
        :interval="3000"
        :duration="500"
        indicator-color="rgba(255,255,255,0.4)"
        indicator-active-color="#fff"
        circular
      >
        <swiper-item v-for="(item, index) in banners" :key="index">
          <view class="banner-item" :style="{ background: item.bg }">
            <text class="banner-icon">{{ item.icon }}</text>
            <text class="banner-title">{{ item.title }}</text>
          </view>
        </swiper-item>
      </swiper>
    </view>

    <view class="menu-grid">
      <view
        v-for="(item, index) in menuList"
        :key="index"
        class="menu-item"
        @click="handleMenuClick(item)"
      >
        <view class="menu-icon" :style="{ background: item.color }">
          <text class="icon-text">{{ item.icon }}</text>
        </view>
        <text class="menu-label">{{ item.label }}</text>
      </view>
    </view>

    <TabBar current="home" />
  </view>
</template>

<script>
import TabBar from '@/components/TabBar/TabBar.vue'

const baseMenus = [
  { label: '相册', icon: '📷', color: '#f48fb1' },
  { label: '点餐', icon: '🍽️', color: '#ce93d8', action: 'order' },
  { label: '钱包', icon: '💳', color: '#ffab91' },
  { label: '导航', icon: '📍', color: '#a5d6a7' },
  { label: '数据', icon: '📊', color: '#90caf9' },
  { label: '设置', icon: '⚙️', color: '#80deea' },
]

const adminMenus = [
  { label: '菜品管理', icon: '📝', color: '#ffd54f', action: 'foodManage' },
  { label: '订单处理', icon: '🔔', color: '#ffcc80', action: 'orderAdmin' },
]

export default {
  components: { TabBar },
  data() {
    return {
      banners: [
        { title: '美味在线点餐', icon: '🍽️', bg: 'linear-gradient(135deg, #ff8a80, #ffab91)' },
        { title: '菜品实时管理', icon: '🍜', bg: 'linear-gradient(135deg, #ff7043, #ffab40)' },
        { title: '订单快速处理', icon: '🔔', bg: 'linear-gradient(135deg, #ec407a, #f48fb1)' },
      ],
      menuList: [...baseMenus],
    }
  },
  onShow() {
    const user = uni.getStorageSync('user')
    this.menuList = user?.role === 'admin'
      ? [baseMenus[0], baseMenus[1], ...adminMenus, ...baseMenus.slice(2)]
      : [...baseMenus]
  },
  methods: {
    handleMenuClick(item) {
      if (item.action === 'order') {
        uni.navigateTo({ url: '/pages/order/order' })
        return
      }
      if (item.action === 'foodManage') {
        uni.navigateTo({ url: '/pages/foodManage/foodManage' })
        return
      }
      if (item.action === 'orderAdmin') {
        uni.navigateTo({ url: '/pages/orderAdmin/orderAdmin' })
        return
      }
      uni.showToast({ title: item.label, icon: 'none' })
    },
  },
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: #f0f0f0;
  padding: 30rpx 30rpx 140rpx;
  box-sizing: border-box;
}

.banner-section {
  margin-bottom: 40rpx;
}

.banner-swiper {
  height: 340rpx;
  border-radius: 24rpx;
  overflow: hidden;
}

.banner-item {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
}

.banner-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.banner-title {
  font-size: 36rpx;
  color: #fff;
  font-weight: 500;
}

.menu-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 24rpx 0;
}

.menu-item {
  width: 30%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 10rpx;
}

.menu-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  margin-bottom: 16rpx;
}

.icon-text {
  font-size: 52rpx;
}

.menu-label {
  font-size: 26rpx;
  color: #666;
}
</style>
