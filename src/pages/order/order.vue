<template>
  <view class="order-page">
    <view class="header">
      <view class="header-btn" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="header-title">点餐</text>
      <view class="header-actions">
        <view class="header-btn history-btn" @click="openHistory">
          <text class="history-icon">🧾</text>
          <view v-if="pendingNoticeCount > 0" class="notice-badge">
            <text class="notice-text">{{ pendingNoticeCount }}</text>
          </view>
        </view>
        <view class="header-btn cart-btn" @click="openCart">
          <text class="cart-icon">🛒</text>
          <view v-if="cartCount > 0" class="cart-badge">
            <text class="badge-text">{{ cartCount > 99 ? '99+' : cartCount }}</text>
          </view>
        </view>
      </view>
    </view>

    <scroll-view class="food-scroll" scroll-y>
      <view class="food-grid">
        <view
          v-for="item in currentFoods"
          :key="item.id"
          class="food-card"
        >
          <view class="food-image-wrap" @click="previewFood(item)">
            <view class="food-image" :style="{ background: item.bg }">
              <image v-if="item.imageUrl" class="food-photo" :src="item.imageUrl" mode="aspectFill" />
              <text v-else class="food-emoji">{{ item.icon }}</text>
            </view>
          </view>
          <text class="food-name">{{ item.name }}</text>
          <text class="food-price">¥{{ item.price }}</text>
          <view class="qty-control" @click.stop>
            <view
              v-if="getQty(item.id) > 0"
              class="qty-btn minus"
              @click="changeQty(item.id, -1)"
            >
              <text class="qty-icon">−</text>
            </view>
            <text v-if="getQty(item.id) > 0" class="qty-num">{{ getQty(item.id) }}</text>
            <view class="qty-btn plus" @click="changeQty(item.id, 1)">
              <text class="qty-icon">+</text>
            </view>
          </view>
        </view>
      </view>
      <view class="scroll-bottom-space" />
    </scroll-view>

    <scroll-view class="category-bar" scroll-x :show-scrollbar="false">
      <view class="category-inner">
        <view
          v-for="cat in categories"
          :key="cat.id"
          class="category-item"
          :class="{ active: activeCategory === cat.id }"
          @click="activeCategory = cat.id"
        >
          <text class="cat-icon">{{ cat.icon }}</text>
          <text class="cat-name">{{ cat.name }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 菜品大图预览 -->
    <view v-if="previewItem" class="modal-mask" @click="previewItem = null">
      <view class="preview-modal" @click.stop>
        <view class="preview-close" @click="previewItem = null">
          <text>✕</text>
        </view>
        <view class="preview-image" :style="{ background: previewItem.bg }">
          <image v-if="previewItem.imageUrl" class="preview-photo" :src="previewItem.imageUrl" mode="aspectFill" />
          <text v-else class="preview-emoji">{{ previewItem.icon }}</text>
        </view>
        <text class="preview-name">{{ previewItem.name }}</text>
        <text class="preview-price">¥{{ previewItem.price }}</text>
        <view class="preview-qty">
          <view
            v-if="getQty(previewItem.id) > 0"
            class="qty-btn minus"
            @click="changeQty(previewItem.id, -1)"
          >
            <text class="qty-icon">−</text>
          </view>
          <text v-if="getQty(previewItem.id) > 0" class="qty-num">{{ getQty(previewItem.id) }}</text>
          <view class="qty-btn plus" @click="changeQty(previewItem.id, 1)">
            <text class="qty-icon">+</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="showHistory" class="modal-mask" @click="showHistory = false">
      <view class="cart-modal" @click.stop>
        <view class="cart-header">
          <text class="cart-title">历史订单</text>
          <view class="cart-close" @click="showHistory = false">
            <text>✕</text>
          </view>
        </view>

        <view v-if="selectedHistoryOrder" class="history-detail">
          <view class="history-detail-head">
            <view>
              <text class="history-detail-title">订单 #{{ selectedHistoryOrder.id }}</text>
              <text class="history-detail-time">{{ formatTime(selectedHistoryOrder.createdAt) }}</text>
            </view>
            <text class="order-status" :class="selectedHistoryOrder.status">{{ getStatusText(selectedHistoryOrder.status) }}</text>
          </view>
          <view class="history-progress-card">
            <text class="history-progress-title">订单进度</text>
            <text class="history-progress-text">{{ getProgressText(selectedHistoryOrder.status) }}</text>
          </view>
          <view class="history-items-card">
            <view v-for="item in selectedHistoryOrder.items" :key="item.id" class="history-item">
              <view class="history-item-left">
                <view class="history-item-thumb" :style="{ background: item.bg || 'linear-gradient(145deg, #fff3e0, #ffe0b2)' }">
                  <image v-if="item.imageUrl" class="history-item-photo" :src="item.imageUrl" mode="aspectFill" @error="handleImageError(item)" />
                  <text v-else>{{ item.icon || '🍽️' }}</text>
                </view>
                <view>
                  <text class="history-item-name">{{ item.name }} × {{ item.qty }}</text>
                  <text class="history-item-meta">单价 ¥{{ item.price.toFixed(2) }}</text>
                </view>
              </view>
              <text class="history-item-price">¥{{ (item.price * item.qty).toFixed(2) }}</text>
            </view>
          </view>
          <view v-if="selectedHistoryOrder.note" class="order-note">备注：{{ selectedHistoryOrder.note }}</view>
          <view class="history-total-card">
            <text class="history-total-label">合计</text>
            <text class="history-total">¥{{ selectedHistoryOrder.totalPrice.toFixed(2) }}</text>
          </view>
          <view class="history-back-btn" @click="selectedHistoryOrder = null">
            <text>返回列表</text>
          </view>
        </view>

        <scroll-view v-else class="cart-list" scroll-y>
          <view
            v-for="order in historyOrders"
            :key="order.id"
            class="history-card"
            @click="selectHistoryOrder(order)"
          >
            <view class="history-card-top">
              <view class="history-card-left">
                <view class="history-card-thumb" :style="{ background: order.items[0]?.bg || 'linear-gradient(145deg, #fff3e0, #ffe0b2)' }">
                  <image v-if="order.items[0]?.imageUrl" class="history-thumb-photo" :src="order.items[0].imageUrl" mode="aspectFill" />
                  <text v-else>{{ order.items[0]?.icon || '🍽️' }}</text>
                </view>
                <view>
                  <text class="history-card-title">订单 #{{ order.id }}</text>
                  <text class="history-card-time">{{ formatTime(order.createdAt) }}</text>
                </view>
              </view>
              <text class="order-status" :class="order.status">{{ getStatusText(order.status) }}</text>
            </view>
            <text class="history-card-meta">{{ order.items.length }} 个菜品 · ¥{{ order.totalPrice.toFixed(2) }}</text>
            <view class="history-card-footer">
              <text class="history-card-tip">{{ getProgressText(order.status) }}</text>
              <text class="history-card-arrow">›</text>
            </view>
          </view>
          <view v-if="!historyOrders.length" class="cart-empty">
            <text>还没有历史订单哦~</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 购物车弹窗 -->
    <view v-if="showCart" class="modal-mask" @click="showCart = false">
      <view class="cart-modal" @click.stop>
        <view class="cart-header">
          <text class="cart-title">我的点单</text>
          <view class="cart-close" @click="showCart = false">
            <text>✕</text>
          </view>
        </view>

        <scroll-view v-if="cartList.length" class="cart-list" scroll-y>
          <view v-for="item in cartList" :key="item.id" class="cart-item">
            <view class="cart-item-img" :style="{ background: item.bg }">
              <image v-if="item.imageUrl" class="cart-item-photo" :src="item.imageUrl" mode="aspectFill" />
              <text v-else>{{ item.icon }}</text>
            </view>
            <view class="cart-item-info">
              <text class="cart-item-name">{{ item.name }}</text>
              <view class="cart-qty-control">
                <view class="cart-qty-btn" @click="changeQty(item.id, -1)">
                  <text>−</text>
                </view>
                <text class="cart-qty-num">{{ item.qty }}</text>
                <view class="cart-qty-btn" @click="changeQty(item.id, 1)">
                  <text>+</text>
                </view>
              </view>
            </view>
            <text class="cart-item-price">¥{{ (item.price * item.qty).toFixed(2) }}</text>
          </view>
        </scroll-view>

        <view v-else class="cart-empty">
          <text>还没有选择菜品哦~</text>
        </view>

        <view class="cart-footer">
          <text class="cart-total">总计: ¥{{ totalPrice.toFixed(2) }}</text>
          <view
            class="submit-btn"
            :class="{ disabled: cartList.length === 0 }"
            @click="submitOrder"
          >
            <text>提交订单</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getCategories, getFoods, getUserOrders, submitOrder as submitOrderApi } from '@/api/foods.js'

export default {
  data() {
    return {
      categories: [],
      foods: [],
      activeCategory: 'main',
      cart: {},
      showCart: false,
      showHistory: false,
      historyOrders: [],
      selectedHistoryOrder: null,
      previewItem: null,
      selectedHistoryOrderId: null,
    }
  },
  async onShow() {
    await this.loadFoods()
    await this.loadHistoryOrders()
  },
  computed: {
    currentFoods() {
      return this.foods.filter((f) => f.category === this.activeCategory)
    },
    cartList() {
      return this.foods
        .filter((f) => this.cart[f.id] > 0)
        .map((f) => ({ ...f, qty: this.cart[f.id] }))
    },
    cartCount() {
      return Object.values(this.cart).reduce((sum, n) => sum + n, 0)
    },
    totalPrice() {
      return this.cartList.reduce((sum, item) => sum + item.price * item.qty, 0)
    },
    pendingNoticeCount() {
      return this.historyOrders.filter((order) => order.status === 'pending').length
    },
  },
  methods: {
    async loadFoods() {
      const [categories, foods] = await Promise.all([getCategories(), getFoods()])
      this.categories = categories
      this.foods = foods
      if (!this.categories.some((cat) => cat.id === this.activeCategory)) {
        this.activeCategory = this.categories[0]?.id || 'main'
      }
    },
    goBack() {
      uni.navigateBack()
    },
    getQty(id) {
      return this.cart[id] || 0
    },
    changeQty(id, delta) {
      const current = this.getQty(id)
      const next = current + delta
      if (next <= 0) {
        const copy = { ...this.cart }
        delete copy[id]
        this.cart = copy
      } else {
        this.cart = { ...this.cart, [id]: next }
      }
    },
    previewFood(item) {
      this.previewItem = item
    },
    openCart() {
      this.showCart = true
    },
    async openHistory() {
      this.selectedHistoryOrder = null
      this.showHistory = true
      await this.loadHistoryOrders()
    },
    async loadHistoryOrders() {
      try {
        this.historyOrders = await getUserOrders()
        const savedId = uni.getStorageSync('selectedHistoryOrderId')
        if (savedId) {
          const found = this.historyOrders.find((order) => String(order.id) === String(savedId))
          this.selectedHistoryOrder = found || null
          this.selectedHistoryOrderId = found?.id || null
        } else {
          this.selectedHistoryOrder = null
          this.selectedHistoryOrderId = null
        }
      } catch (error) {
        this.historyOrders = []
      }
    },
    selectHistoryOrder(order) {
      this.selectedHistoryOrder = order
      this.selectedHistoryOrderId = order?.id || null
      if (order?.id) {
        uni.setStorageSync('selectedHistoryOrderId', order.id)
      }
    },
    getStatusText(status) {
      const map = {
        pending: '待处理',
        approved: '已同意',
        returned: '已退回',
      }
      return map[status] || status
    },
    getProgressText(status) {
      const map = {
        pending: '店家正在处理您的订单',
        approved: '订单已确认，正在为您准备中',
        returned: '订单已退回，请根据提示修改后重新提交',
      }
      return map[status] || '订单状态已更新'
    },
    formatTime(value) {
      return new Date(value).toLocaleString()
    },
    handleImageError(item) {
      if (item) {
        item.imageUrl = ''
      }
    },
    async submitOrder() {
      if (this.cartList.length === 0) return
      try {
        const result = await submitOrderApi({
          items: this.cartList.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            qty: item.qty,
            imageUrl: item.imageUrl,
            icon: item.icon,
          })),
          totalPrice: this.totalPrice,
        })
        uni.showToast({ title: '订单提交成功，等待处理', icon: 'success' })
        await this.loadHistoryOrders()
        if (result?.status === 'pending') {
          uni.showToast({ title: '已收到订单，店家会尽快处理', icon: 'success' })
        }
        this.cart = {}
        this.showCart = false
      } catch (error) {
        uni.showToast({ title: error.message || '提交失败', icon: 'none' })
      }
    },
  },
}
</script>

<style scoped>
.order-page {
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  padding-top: calc(20rpx + env(safe-area-inset-top));
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}

.header-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notice-badge {
  position: absolute;
  top: 2rpx;
  right: 2rpx;
  min-width: 30rpx;
  height: 30rpx;
  padding: 0 8rpx;
  border-radius: 15rpx;
  background: #ff5a5f;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notice-text {
  font-size: 20rpx;
  color: #fff;
  font-weight: 700;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.back-icon {
  font-size: 56rpx;
  color: #333;
  font-weight: 300;
  line-height: 1;
}

.header-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.cart-btn {
  position: relative;
}

.cart-icon {
  font-size: 44rpx;
}

.cart-badge {
  position: absolute;
  top: 4rpx;
  right: 0;
  min-width: 32rpx;
  height: 32rpx;
  background: #ff3b30;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
}

.badge-text {
  font-size: 20rpx;
  color: #fff;
  font-weight: 600;
  line-height: 1;
}

.food-scroll {
  flex: 1;
  height: 0;
}

.food-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 20rpx 16rpx;
  gap: 16rpx;
}

.food-card {
  width: calc(33.33% - 12rpx);
  border: 2rpx solid #1a1a1a;
  border-radius: 20rpx;
  padding: 16rpx 12rpx 20rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fff;
}

.food-image-wrap {
  width: 100%;
  margin-bottom: 12rpx;
}

.food-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.food-photo {
  width: 100%;
  height: 100%;
}

.food-emoji {
  font-size: 72rpx;
}

.food-name {
  font-size: 24rpx;
  color: #1a1a1a;
  text-align: center;
  line-height: 1.3;
  margin-bottom: 6rpx;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.food-price {
  font-size: 30rpx;
  font-weight: 700;
  color: #e53935;
  margin-bottom: 14rpx;
}

.qty-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  min-height: 52rpx;
}

.qty-btn {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s;
}

.qty-btn:active {
  transform: scale(0.9);
}

.qty-btn.plus {
  background: linear-gradient(145deg, #66bb6a, #43a047);
  box-shadow: 0 4rpx 12rpx rgba(67, 160, 71, 0.35);
}

.qty-btn.minus {
  background: linear-gradient(145deg, #66bb6a, #43a047);
  box-shadow: 0 4rpx 12rpx rgba(67, 160, 71, 0.35);
}

.qty-icon {
  font-size: 36rpx;
  color: #fff;
  font-weight: 500;
  line-height: 1;
}

.qty-num {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
  min-width: 28rpx;
  text-align: center;
}

.scroll-bottom-space {
  height: 140rpx;
}

.category-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-top: 1rpx solid #eee;
  padding: 16rpx 0;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  white-space: nowrap;
}

.category-inner {
  display: inline-flex;
  padding: 0 20rpx;
  gap: 16rpx;
}

.category-item {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 28rpx;
  border-radius: 40rpx;
  border: 2rpx solid #e0e0e0;
  background: #fff;
  flex-shrink: 0;
}

.category-item.active {
  background: #1a1a1a;
  border-color: #1a1a1a;
}

.cat-icon {
  font-size: 32rpx;
}

.cat-name {
  font-size: 28rpx;
  color: #333;
  white-space: nowrap;
}

.category-item.active .cat-name {
  color: #fff;
  font-weight: 500;
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.preview-modal {
  width: 560rpx;
  background: #fff;
  border-radius: 28rpx;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.preview-close {
  position: absolute;
  top: 20rpx;
  right: 24rpx;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #999;
}

.preview-image {
  width: 360rpx;
  height: 360rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
  overflow: hidden;
}

.preview-photo {
  width: 100%;
  height: 100%;
}

.preview-emoji {
  font-size: 160rpx;
}

.preview-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 12rpx;
}

.preview-price {
  font-size: 40rpx;
  font-weight: 700;
  color: #e53935;
  margin-bottom: 30rpx;
}

.preview-qty {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.cart-modal {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 620rpx;
  max-height: 70vh;
  background: #fff;
  border-radius: 28rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.cart-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.cart-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #999;
}

.cart-list {
  max-height: 400rpx;
  padding: 0 24rpx;
}

.cart-item {
  display: flex;
  align-items: center;
  padding: 24rpx 8rpx;
  border-bottom: 1rpx solid #f5f5f5;
  gap: 20rpx;
}

.cart-item-img {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  flex-shrink: 0;
  overflow: hidden;
}

.cart-item-photo {
  width: 100%;
  height: 100%;
}

.cart-item-info {
  flex: 1;
  min-width: 0;
}

.cart-item-name {
  font-size: 28rpx;
  color: #1a1a1a;
  display: block;
  margin-bottom: 12rpx;
}

.cart-qty-control {
  display: inline-flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 28rpx;
  padding: 4rpx;
}

.cart-qty-btn {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #666;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.06);
}

.cart-qty-num {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  min-width: 48rpx;
  text-align: center;
}

.cart-item-price {
  font-size: 30rpx;
  font-weight: 700;
  color: #e53935;
  flex-shrink: 0;
}

.cart-empty {
  padding: 80rpx 0;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}

.history-progress-card,
.history-items-card {
  margin-top: 18rpx;
  padding: 18rpx 20rpx;
  border-radius: 16rpx;
  background: #f8f8f8;
}

.history-progress-title {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #333;
}

.history-progress-text {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #666;
}

.history-item {
  display: flex;
  justify-content: space-between;
  padding: 10rpx 0;
  color: #444;
  font-size: 26rpx;
}

.history-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12rpx;
  color: #ff7a00;
  font-size: 24rpx;
}

.history-card-arrow {
  font-size: 32rpx;
  font-weight: 500;
}

.history-card {
  margin-bottom: 16rpx;
  padding: 22rpx 18rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #fff 0%, #fafafa 100%);
  box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.04);
  border: 1rpx solid #f3f3f3;
}

.history-detail {
  padding: 12rpx 8rpx 20rpx;
}

.history-detail-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.history-detail-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.history-detail-time {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #999;
}

.history-progress-card,
.history-items-card,
.history-total-card {
  padding: 20rpx;
  border-radius: 20rpx;
  background: #fff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
  margin-bottom: 16rpx;
}

.history-progress-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #333;
}

.history-progress-text {
  display: block;
  margin-top: 8rpx;
  color: #666;
  font-size: 24rpx;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 0;
  border-bottom: 1rpx solid #f2f2f2;
}

.history-item-left {
  display: flex;
  align-items: center;
  gap: 14rpx;
  min-width: 0;
}

.history-item-thumb {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.history-item-photo {
  width: 100%;
  height: 100%;
}

.history-item-name {
  display: block;
  font-size: 26rpx;
  color: #333;
}

.history-item-meta {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #999;
}

.history-item-price {
  font-size: 26rpx;
  font-weight: 600;
  color: #e53935;
}

.history-total-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #fff8e1, #ffe082);
}

.history-total-label {
  font-size: 28rpx;
  color: #8d6e00;
  font-weight: 700;
}

.history-total {
  font-size: 32rpx;
  font-weight: 700;
  color: #e53935;
}

.history-back-btn {
  margin-top: 20rpx;
  padding: 16rpx 0;
  text-align: center;
  border-radius: 999rpx;
  background: #f5f5f5;
  color: #666;
  font-size: 28rpx;
}

.history-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12rpx;
}

.history-card-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-width: 0;
}

.history-card-thumb {
  width: 80rpx;
  height: 80rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.history-thumb-photo {
  width: 100%;
  height: 100%;
}

.history-card-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #333;
}

.history-card-time {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #999;
}

.history-card-meta {
  display: block;
  margin-top: 14rpx;
  color: #666;
  font-size: 24rpx;
}

.order-status {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #666;
  background: #f2f2f2;
}

.order-status.pending {
  background: #fff3e0;
  color: #f57c00;
}

.order-status.approved {
  background: #e8f5e9;
  color: #2e7d32;
}

.order-status.returned {
  background: #ffebee;
  color: #c62828;
}

.cart-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx 32rpx;
  border-top: 1rpx solid #f0f0f0;
}

.cart-total {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.submit-btn {
  background: linear-gradient(145deg, #66bb6a, #43a047);
  color: #fff;
  font-size: 28rpx;
  font-weight: 500;
  padding: 18rpx 40rpx;
  border-radius: 40rpx;
  box-shadow: 0 6rpx 16rpx rgba(67, 160, 71, 0.3);
}

.submit-btn.disabled {
  opacity: 0.5;
}
</style>
