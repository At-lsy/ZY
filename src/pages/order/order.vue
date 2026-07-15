<template>
  <view class="order-page">
    <view class="header">
      <view class="header-btn" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="header-title">点餐</text>
      <view class="header-btn cart-btn" @click="openCart">
        <text class="cart-icon">🛒</text>
        <view v-if="cartCount > 0" class="cart-badge">
          <text class="badge-text">{{ cartCount > 99 ? '99+' : cartCount }}</text>
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
              <text class="food-emoji">{{ item.icon }}</text>
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
          <text class="preview-emoji">{{ previewItem.icon }}</text>
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
              <text>{{ item.icon }}</text>
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
import { categories, foods } from '@/data/foods.js'

export default {
  data() {
    return {
      categories,
      foods,
      activeCategory: 'main',
      cart: {},
      showCart: false,
      previewItem: null,
    }
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
  },
  methods: {
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
    submitOrder() {
      if (this.cartList.length === 0) return
      uni.showToast({ title: '订单提交成功', icon: 'success' })
      this.cart = {}
      this.showCart = false
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
