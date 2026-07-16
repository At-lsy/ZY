<template>
  <view class="admin-page">
    <view class="header">
      <view class="header-btn" @click="goBack"><text class="back-icon">‹</text></view>
      <text class="header-title">订单处理</text>
      <view class="header-btn" @click="loadOrders"><text class="refresh-icon">⟳</text></view>
    </view>

    <view v-if="pendingCount" class="order-tip">当前有 {{ pendingCount }} 个待处理订单</view>

    <scroll-view class="order-list" scroll-y>
      <view v-for="order in orders" :key="order.id" class="order-card">
        <view class="order-head">
          <view>
            <text class="order-title">{{ order.username }} 的订单</text>
            <text class="order-time">{{ formatTime(order.createdAt) }}</text>
          </view>
          <text class="order-status" :class="order.status">{{ getStatusText(order.status) }}</text>
        </view>

        <view v-for="item in order.items" :key="item.id" class="order-food">
          <view class="food-left">
            <view class="food-thumb">
              <image v-if="item.imageUrl" class="food-photo" :src="item.imageUrl" mode="aspectFill" />
              <text v-else>{{ item.icon }}</text>
            </view>
            <text class="food-name">{{ item.name }} × {{ item.qty }}</text>
          </view>
          <text class="food-price">¥{{ (item.price * item.qty).toFixed(2) }}</text>
        </view>

        <view v-if="order.note" class="order-note">退回说明：{{ order.note }}</view>

        <view class="order-foot">
          <text class="order-total">合计 ¥{{ order.totalPrice.toFixed(2) }}</text>
          <view v-if="order.status === 'pending'" class="order-actions">
            <view class="return-btn" @click="openReturn(order)">修改退回</view>
            <view class="approve-btn" @click="handleOrder(order, 'approved')">同意</view>
          </view>
        </view>
      </view>
      <view v-if="!orders.length" class="empty">暂无订单</view>
      <view class="bottom-space" />
    </scroll-view>

    <view v-if="returnOrder" class="modal-mask" @click="closeReturn">
      <view class="return-modal" @click.stop>
        <text class="modal-title">修改退回</text>
        <textarea
          class="return-input"
          v-model="returnNote"
          placeholder="请填写需要用户修改的内容"
        />
        <view class="modal-actions">
          <view class="cancel-btn" @click="closeReturn">取消</view>
          <view class="return-confirm-btn" @click="handleOrder(returnOrder, 'returned')">确认退回</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getOrders, updateOrderStatus } from '@/api/foods.js'

export default {
  data() {
    return {
      orders: [],
      orderTimer: null,
      returnOrder: null,
      returnNote: '',
    }
  },
  computed: {
    pendingCount() {
      return this.orders.filter((order) => order.status === 'pending').length
    },
  },
  async onShow() {
    const user = uni.getStorageSync('user')
    if (user?.role !== 'admin') {
      uni.showToast({ title: '当前账号没有管理权限', icon: 'none' })
      uni.navigateBack()
      return
    }
    await this.loadOrders()
    this.orderTimer = setInterval(this.loadOrders, 5000)
  },
  onHide() {
    clearInterval(this.orderTimer)
  },
  onUnload() {
    clearInterval(this.orderTimer)
  },
  methods: {
    async loadOrders() {
      this.orders = await getOrders()
    },
    getStatusText(status) {
      const map = {
        pending: '待处理',
        approved: '已同意',
        returned: '已退回',
      }
      return map[status] || status
    },
    formatTime(value) {
      return new Date(value).toLocaleString()
    },
    openReturn(order) {
      this.returnOrder = order
      this.returnNote = ''
    },
    closeReturn() {
      this.returnOrder = null
      this.returnNote = ''
    },
    async handleOrder(order, status) {
      if (status === 'returned' && !this.returnNote.trim()) {
        uni.showToast({ title: '请填写退回说明', icon: 'none' })
        return
      }
      const updatedOrder = await updateOrderStatus(order.id, {
        status,
        note: status === 'returned' ? this.returnNote : '',
      })
      this.orders = this.orders.map((item) => (item.id === updatedOrder.id ? updatedOrder : item))
      this.closeReturn()
      uni.showToast({ title: status === 'approved' ? '已同意订单' : '已退回修改', icon: 'success' })
    },
    goBack() {
      uni.navigateBack()
    },
  },
}
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: #f6f6f6;
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
  border-bottom: 1rpx solid #eeeeee;
}

.header-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 64rpx;
  color: #333;
}

.refresh-icon {
  font-size: 40rpx;
  color: #333;
}

.header-title {
  font-size: 36rpx;
  font-weight: 700;
}

.order-tip {
  margin: 20rpx 24rpx 0;
  padding: 20rpx 24rpx;
  border-radius: 18rpx;
  background: #fff3e0;
  color: #e65100;
  font-size: 28rpx;
}

.order-list {
  flex: 1;
  height: 0;
}

.order-card {
  margin: 20rpx 24rpx 0;
  padding: 26rpx;
  border-radius: 24rpx;
  background: #fff;
  box-shadow: 0 4rpx 18rpx rgba(0, 0, 0, 0.04);
}

.order-head,
.order-foot,
.order-food,
.food-left,
.order-actions {
  display: flex;
  align-items: center;
}

.order-head,
.order-foot,
.order-food {
  justify-content: space-between;
}

.order-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
}

.order-time {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999;
}

.order-status {
  padding: 8rpx 18rpx;
  border-radius: 24rpx;
  background: #eeeeee;
  color: #666;
  font-size: 24rpx;
}

.order-status.pending {
  background: #fff3e0;
  color: #e65100;
}

.order-status.approved {
  background: #e8f5e9;
  color: #2e7d32;
}

.order-status.returned {
  background: #ffebee;
  color: #c62828;
}

.order-food {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.food-left {
  min-width: 0;
  gap: 16rpx;
}

.food-thumb {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  overflow: hidden;
  flex-shrink: 0;
}

.food-photo {
  width: 100%;
  height: 100%;
}

.food-name {
  font-size: 28rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.food-price {
  font-size: 28rpx;
  color: #e53935;
  font-weight: 700;
}

.order-note {
  margin-top: 18rpx;
  padding: 18rpx;
  border-radius: 16rpx;
  background: #fff8e1;
  color: #8d6e00;
  font-size: 26rpx;
}

.order-foot {
  margin-top: 22rpx;
}

.order-total {
  font-size: 32rpx;
  font-weight: 700;
  color: #e53935;
}

.order-actions {
  gap: 16rpx;
}

.return-btn,
.approve-btn {
  padding: 16rpx 26rpx;
  border-radius: 34rpx;
  font-size: 26rpx;
  font-weight: 600;
}

.return-btn {
  background: #ffebee;
  color: #c62828;
}

.approve-btn {
  background: #43a047;
  color: #fff;
}

.empty {
  padding-top: 160rpx;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}

.bottom-space {
  height: 40rpx;
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}

.return-modal {
  width: 620rpx;
  background: #fff;
  border-radius: 28rpx;
  padding: 34rpx;
  box-sizing: border-box;
}

.modal-title {
  display: block;
  text-align: center;
  font-size: 34rpx;
  font-weight: 700;
  margin-bottom: 24rpx;
}

.return-input {
  width: 100%;
  height: 180rpx;
  box-sizing: border-box;
  padding: 22rpx;
  border-radius: 18rpx;
  background: #f6f6f6;
  font-size: 28rpx;
}

.modal-actions {
  display: flex;
  gap: 18rpx;
  margin-top: 30rpx;
}

.cancel-btn,
.return-confirm-btn {
  flex: 1;
  height: 76rpx;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
}

.cancel-btn {
  background: #eeeeee;
  color: #666;
}

.return-confirm-btn {
  background: #e53935;
  color: #fff;
}
</style>
