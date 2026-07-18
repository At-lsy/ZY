<template>
  <view class="chat-page">
    <scroll-view
      class="chat-list"
      scroll-y
      :scroll-top="scrollTop"
      :scroll-with-animation="true"
    >
      <view class="chat-inner">
        <template v-for="(item, index) in renderList" :key="index">
          <view v-if="item.type === 'time'" class="time-divider">
            <text class="time-text">{{ item.label }}</text>
          </view>

          <view
            v-else
            class="message-row"
            :class="item.isSelf ? 'self' : 'other'"
          >
            <view v-if="!item.isSelf" class="avatar other-avatar">
              <text>😊</text>
            </view>

            <view class="bubble-wrap" :class="item.isSelf ? 'wrap-self' : 'wrap-other'">
              <view
                class="bubble"
                :class="item.isSelf ? 'bubble-self' : 'bubble-other'"
              >
                <text class="bubble-text">{{ item.content }}</text>
              </view>
              <text class="msg-time">{{ item.shortTime }}</text>
            </view>

            <view v-if="item.isSelf" class="avatar self-avatar">
              <text>我</text>
            </view>
          </view>
        </template>
      </view>
    </scroll-view>

    <view class="input-bar">
      <view class="bar-icon-wrap">
        <text class="bar-icon">🎤</text>
      </view>
      <view class="input-wrap">
        <input
          v-model="inputText"
          class="chat-input"
          placeholder="输入消息"
          placeholder-class="placeholder"
          confirm-type="send"
          @confirm="sendMessage"
        />
      </view>
      <view class="bar-icon-wrap">
        <text class="bar-icon emoji-icon">😊</text>
      </view>
      <view class="bar-icon-wrap" @click="sendMessage">
        <text class="bar-icon add-icon">⊕</text>
      </view>
    </view>

    <TabBar current="chat" />
  </view>
</template>

<script>
import TabBar from '@/components/TabBar/TabBar.vue'

function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3000/api'
    }
    return `http://${host}:3000/api`
  }
  return 'http://localhost:3000/api'
}

const API_BASE_URL = getApiBaseUrl()

const TIME_GAP = 5 * 60 * 1000

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatChatTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const h = pad(date.getHours())
  const m = pad(date.getMinutes())
  const timeStr = `${h}:${m}`

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (isSameDay(date, now)) return timeStr

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(date, yesterday)) return `昨天 ${timeStr}`

  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`
}

function formatShortTime(timestamp) {
  const date = new Date(timestamp)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default {
  components: { TabBar },
  data() {
    const base = new Date()
    base.setHours(14, 10, 0, 0)

    return {
      inputText: '',
      scrollTop: 0,
      messages: [],
      chatTimer: null,
      currentUserName: 'user',
      partnerName: '店长',
      messageCount: 0,
      isActive: false,
    }
  },
  computed: {
    renderList() {
      const list = []
      this.messages.forEach((msg, index) => {
        const prev = index > 0 ? this.messages[index - 1] : null
        if (!prev || msg.time - prev.time > TIME_GAP) {
          list.push({
            type: 'time',
            label: formatChatTime(msg.time),
          })
        }
        list.push({
          type: 'message',
          content: msg.content,
          isSelf: msg.isSelf,
          shortTime: formatShortTime(msg.time),
        })
      })
      return list
    },
  },
  methods: {
    async loadMessages() {
      try {
        const user = uni.getStorageSync('user') || {}
        this.currentUserName = user.username || 'user'
        this.partnerName = user.role === 'admin' ? '用户' : '店长'
        const res = await uni.request({
          url: `${API_BASE_URL}/chat/messages`,
          method: 'GET',
          header: {
            Authorization: `Bearer ${uni.getStorageSync('token') || ''}`,
          },
        })
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const prevCount = this.messages.length
          this.messages = (res.data || []).map((item) => ({
            content: item.content,
            isSelf: item.username === this.currentUserName,
            time: item.time || Date.now(),
          }))
          const incoming = this.messages.length - prevCount
          if (incoming > 0 && !this.isActive) {
            const unread = Number(uni.getStorageSync('chatUnreadCount') || 0) + incoming
            uni.setStorageSync('chatUnreadCount', unread)
          }
          if (this.isActive) {
            this.markMessagesAsRead()
          }
          this.messageCount = Number(uni.getStorageSync('chatUnreadCount') || 0)
          this.$nextTick(() => this.scrollToBottom())
        }
      } catch (error) {
        console.error('loadMessages failed', error)
      }
    },
    async sendMessage() {
      const text = this.inputText.trim()
      if (!text) return

      try {
        const res = await uni.request({
          url: `${API_BASE_URL}/chat/messages`,
          method: 'POST',
          header: {
            Authorization: `Bearer ${uni.getStorageSync('token') || ''}`,
          },
          data: {
            content: text,
          },
        })
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.inputText = ''
          await this.loadMessages()
        }
      } catch (error) {
        uni.showToast({ title: '发送失败', icon: 'none' })
      }
    },
    markMessagesAsRead() {
      uni.setStorageSync('chatUnreadCount', 0)
      this.messageCount = 0
    },
    scrollToBottom() {
      this.$nextTick(() => {
        this.scrollTop = this.scrollTop === 99999 ? 100000 : 99999
      })
    },
  },
  mounted() {
    this.isActive = true
    this.markMessagesAsRead()
    this.loadMessages()
    this.chatTimer = setInterval(() => {
      this.loadMessages()
    }, 4000)
  },
  onShow() {
    this.isActive = true
    this.markMessagesAsRead()
  },
  onHide() {
    this.isActive = false
  },
  onUnload() {
    this.isActive = false
    if (this.chatTimer) clearInterval(this.chatTimer)
  },
}
</script>

<style scoped>
.chat-page {
  min-height: 100vh;
  background: #ededed;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.chat-list {
  flex: 1;
  height: calc(100vh - 200rpx);
  box-sizing: border-box;
}

.chat-inner {
  padding: 24rpx 24rpx 200rpx;
  min-height: 100%;
  box-sizing: border-box;
}

.time-divider {
  display: flex;
  justify-content: center;
  margin: 24rpx 0 32rpx;
}

.time-text {
  font-size: 22rpx;
  color: #b2b2b2;
  background: rgba(0, 0, 0, 0.05);
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
  line-height: 1.4;
}

.message-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 28rpx;
}

.message-row.other {
  flex-direction: row;
}

.message-row.self {
  flex-direction: row;
  justify-content: flex-end;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.other-avatar {
  background: #f8bbd0;
  margin-right: 20rpx;
  font-size: 44rpx;
}

.self-avatar {
  background: #64b5f6;
  color: #fff;
  margin-left: 20rpx;
  font-size: 28rpx;
  font-weight: 500;
}

.bubble-wrap {
  display: flex;
  flex-direction: column;
  max-width: 68%;
}

.wrap-other {
  align-items: flex-start;
}

.wrap-self {
  align-items: flex-end;
}

.bubble {
  position: relative;
  padding: 18rpx 22rpx;
  border-radius: 8rpx;
  word-break: break-all;
}

.bubble-other {
  background: #fff;
  margin-left: 4rpx;
}

.bubble-other::before {
  content: '';
  position: absolute;
  left: -16rpx;
  top: 26rpx;
  width: 0;
  height: 0;
  border: 10rpx solid transparent;
  border-right-color: #fff;
}

.bubble-self {
  background: #95ec69;
  margin-right: 4rpx;
}

.bubble-self::before {
  content: '';
  position: absolute;
  right: -16rpx;
  top: 26rpx;
  width: 0;
  height: 0;
  border: 10rpx solid transparent;
  border-left-color: #95ec69;
}

.bubble-text {
  font-size: 32rpx;
  color: #1a1a1a;
  line-height: 1.55;
}

.msg-time {
  font-size: 20rpx;
  color: #b2b2b2;
  margin-top: 8rpx;
  line-height: 1;
}

.input-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 110rpx;
  display: flex;
  align-items: center;
  padding: 14rpx 16rpx;
  background: #f7f7f7;
  border-top: 1rpx solid #dcdcdc;
  gap: 12rpx;
  z-index: 99;
  box-sizing: border-box;
}

.bar-icon-wrap {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bar-icon {
  font-size: 44rpx;
  color: #666;
  line-height: 1;
}

.emoji-icon {
  font-size: 40rpx;
}

.add-icon {
  font-size: 52rpx;
  color: #888;
  font-weight: 300;
}

.input-wrap {
  flex: 1;
  background: #fff;
  border-radius: 8rpx;
  border: 1rpx solid #e0e0e0;
  overflow: hidden;
}

.chat-input {
  width: 100%;
  height: 72rpx;
  padding: 0 20rpx;
  font-size: 30rpx;
  color: #333;
  box-sizing: border-box;
}

.placeholder {
  color: #b2b2b2;
}
</style>
