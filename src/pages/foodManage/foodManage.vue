<template>
  <view class="manage-page">
    <view class="header">
      <view class="header-btn" @click="goBack"><text class="back-icon">‹</text></view>
      <text class="header-title">菜品管理</text>
      <view class="header-actions">
        <view v-if="canManage" class="header-btn" @click="openCategoryModal"><text class="new-icon">🏷️</text></view>
        <view v-if="canManage" class="header-btn" @click="openCreate"><text class="new-icon">＋</text></view>
        <view class="header-btn" @click="loadFoods"><text class="refresh-icon">⟳</text></view>
      </view>
    </view>

    <scroll-view class="category-bar" scroll-x :show-scrollbar="false">
      <view class="category-inner">
        <view
          class="category-item"
          :class="{ active: activeCategory === 'all' }"
          @click="activeCategory = 'all'"
        >
          <text class="cat-name">全部</text>
        </view>
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

    <scroll-view class="food-list" scroll-y>
      <view v-for="item in filteredFoods" :key="item.id" class="food-row" @click="openEditor(item)">
        <view class="food-thumb" :style="{ background: item.bg }">
          <image v-if="item.imageUrl" class="food-photo" :src="item.imageUrl" mode="aspectFill" />
          <text v-else class="food-icon">{{ item.icon }}</text>
        </view>
        <view class="food-info">
          <text class="food-name">{{ item.name }}</text>
          <text class="food-meta">¥{{ item.price }} · {{ getCategoryName(item.category) }}</text>
        </view>
        <view class="food-actions">
          <text class="edit-text">{{ canManage ? '编辑' : '查看' }}</text>
          <view v-if="canManage" class="delete-btn" @click.stop.prevent="deleteFood(item)">删除</view>
        </view>
      </view>
      <view class="bottom-space" />
    </scroll-view>

    <view v-if="showCategoryModal" class="modal-mask" @click="closeCategoryModal">
      <view class="edit-modal" @click.stop>
        <text class="modal-title">新增分类</text>
        <view class="form-item">
          <text class="form-label">分类名称</text>
          <input class="form-input" v-model="categoryForm.name" placeholder="例如：家常菜" />
        </view>
        <view class="form-item">
          <text class="form-label">分类图标</text>
          <input class="form-input" v-model="categoryForm.icon" placeholder="例如：🍲" />
        </view>
        <view class="modal-actions">
          <view class="cancel-btn" @click="closeCategoryModal">取消</view>
          <view class="save-btn" @click="saveCategory">确认新增</view>
        </view>
      </view>
    </view>

    <view v-if="editingFood !== null || isCreating" class="modal-mask" @click="closeEditor">
      <view class="edit-modal" @click.stop>
        <text class="modal-title">{{ editingFood ? '修改菜品' : '新增菜品' }}</text>
        <view class="preview" :style="{ background: form.bg }" @click="chooseImage">
          <image v-if="form.imageUrl" class="preview-photo" :src="form.imageUrl" mode="aspectFill" @error="handleImageError(form)" />
          <text v-else class="preview-icon">{{ form.icon }}</text>
        </view>
        <text class="upload-hint" @click="chooseImage">
          {{ imageChanged ? '新图片已上传，保存后同步到菜品' : '点击上传新图片' }}
        </text>

        <view class="form-item">
          <text class="form-label">名称</text>
          <input class="form-input" v-model="form.name" placeholder="请输入食品名称" />
        </view>
        <view class="form-item">
          <text class="form-label">价格</text>
          <input class="form-input" v-model="form.price" type="digit" placeholder="请输入价格" />
        </view>
        <view class="form-item">
          <text class="form-label">分类</text>
          <picker :range="categoryNames" :value="categoryIndex" @change="changeCategory">
            <view class="picker-input">{{ getCategoryName(form.category) }}</view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label">图标</text>
          <input class="form-input" v-model="form.icon" placeholder="没有照片时显示" />
        </view>

        <view class="modal-actions">
          <view class="cancel-btn" @click="closeEditor">取消</view>
          <view class="save-btn" @click="saveFood">{{ editingFood ? '保存修改' : '新增菜品' }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { createCategory, createFood, deleteFood as deleteFoodApi, getCategories, getFoods, updateFood, uploadFoodImage } from '@/api/foods.js'

export default {
  data() {
    return {
      categories: [],
      foods: [],
      activeCategory: 'all',
      editingFood: null,
      isCreating: false,
      imageChanged: false,
      canManage: false,
      showCategoryModal: false,
      categoryForm: {
        name: '',
        icon: '🍽️',
      },
      form: {
        name: '',
        price: '',
        imageUrl: '',
        icon: '',
        category: '',
        bg: '',
      },
    }
  },
  computed: {
    filteredFoods() {
      if (this.activeCategory === 'all') return this.foods
      return this.foods.filter((item) => item.category === this.activeCategory)
    },
    categoryNames() {
      return this.categories.map((item) => item.name)
    },
    categoryIndex() {
      const index = this.categories.findIndex((item) => item.id === this.form.category)
      return index < 0 ? 0 : index
    },
  },
  async onShow() {
    const user = uni.getStorageSync('user')
    if (!user) {
      uni.reLaunch({ url: '/pages/login/login' })
      return
    }
    this.canManage = user?.role === 'admin'
    await this.loadFoods()
  },
  methods: {
    async loadFoods() {
      const [categories, foods] = await Promise.all([getCategories(), getFoods()])
      this.categories = categories
      this.foods = foods
    },
    getCategoryName(categoryId) {
      return this.categories.find((item) => item.id === categoryId)?.name || categoryId
    },
    openEditor(food) {
      if (!this.canManage) {
        uni.showToast({ title: '仅管理员可编辑菜品', icon: 'none' })
        return
      }
      this.editingFood = food
      this.isCreating = false
      this.imageChanged = false
      this.form = { ...food, price: String(food.price) }
    },
    openCreate() {
      if (!this.canManage) {
        uni.showToast({ title: '仅管理员可新增菜品', icon: 'none' })
        return
      }
      this.editingFood = null
      this.isCreating = true
      this.imageChanged = false
      this.form = {
        name: '',
        price: '',
        imageUrl: '',
        icon: this.categories[0]?.icon || '🍽️',
        category: this.categories[0]?.id || 'main',
        bg: 'linear-gradient(145deg, #f5f5f5, #e0e0e0)',
      }
    },
    closeEditor() {
      this.editingFood = null
      this.isCreating = false
      this.imageChanged = false
    },
    openCategoryModal() {
      this.showCategoryModal = true
      this.categoryForm = { name: '', icon: '🍽️' }
    },
    closeCategoryModal() {
      this.showCategoryModal = false
    },
    async saveCategory() {
      const name = this.categoryForm.name.trim()
      if (!name) {
        uni.showToast({ title: '分类名称不能为空', icon: 'none' })
        return
      }
      const category = await createCategory({ name, icon: this.categoryForm.icon || '🍽️' })
      this.categories = [...this.categories, category]
      this.form.category = category.id
      this.closeCategoryModal()
      uni.showToast({ title: '分类新增成功', icon: 'success' })
    },
    changeCategory(event) {
      this.form.category = this.categories[Number(event.detail.value)]?.id || this.form.category
    },
    chooseImage() {
      uni.chooseImage({
        count: 1,
        success: async (res) => {
          try {
            const uploaded = await uploadFoodImage(res.tempFilePaths[0], this.editingFood?.imageUrl)
            this.form.imageUrl = uploaded.url
            this.imageChanged = true
            uni.showToast({ title: '图片上传成功', icon: 'success' })
          } catch (error) {
            uni.showToast({ title: error.message || '上传失败', icon: 'none' })
          }
        },
      })
    },
    async deleteFood(food) {
      const confirm = await new Promise((resolve) => {
        uni.showModal({
          title: '删除菜品',
          content: `确定删除 ${food.name} 吗？`,
          success: (res) => resolve(res.confirm),
        })
      })
      if (!confirm) return
      try {
        const result = await deleteFoodApi(food.id)
        if (result && result.success !== false) {
          this.foods = this.foods.filter((item) => item.id !== food.id)
          uni.showToast({ title: '删除成功', icon: 'success' })
        } else {
          throw new Error('删除失败')
        }
      } catch (error) {
        console.error('deleteFood error', error)
        uni.showToast({ title: error.message || '删除失败', icon: 'none' })
      }
    },
    async saveFood() {
      const price = Number(this.form.price)
      if (!this.form.name.trim() || Number.isNaN(price) || price < 0) {
        uni.showToast({ title: '请填写正确的名称和价格', icon: 'none' })
        return
      }

      const payload = { ...this.form, price, icon: this.form.icon || '🍽️' }
      const savedFood = this.editingFood
        ? await updateFood(this.editingFood.id, payload)
        : await createFood(payload)

      if (this.editingFood) {
        this.foods = this.foods.map((item) => (item.id === savedFood.id ? savedFood : item))
      } else {
        this.foods = [savedFood, ...this.foods]
      }
      this.closeEditor()
      uni.showToast({ title: this.editingFood ? '已同步到服务器' : '新增菜品成功', icon: 'success' })
    },
    handleImageError(item) {
      if (item) {
        item.imageUrl = ''
      }
    },
    goBack() {
      uni.navigateBack()
    },
  },
}
</script>

<style scoped>
.manage-page {
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.back-icon {
  font-size: 64rpx;
  color: #333;
}

.refresh-icon {
  font-size: 40rpx;
  color: #333;
}

.new-icon {
  font-size: 48rpx;
  color: #333;
  font-weight: 700;
}

.header-title {
  font-size: 36rpx;
  font-weight: 700;
}

.category-bar {
  background: #fff;
  border-bottom: 1rpx solid #eeeeee;
  white-space: nowrap;
}

.category-inner {
  display: inline-flex;
  gap: 16rpx;
  padding: 18rpx 24rpx;
}

.category-item {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 26rpx;
  border-radius: 36rpx;
  background: #f5f5f5;
  color: #666;
}

.category-item.active {
  background: #1a1a1a;
  color: #fff;
}

.cat-icon {
  font-size: 30rpx;
}

.cat-name {
  font-size: 26rpx;
}

.food-list {
  flex: 1;
  height: 0;
}

.food-row {
  margin: 20rpx 24rpx 0;
  padding: 24rpx;
  background: #fff;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  gap: 22rpx;
  box-shadow: 0 4rpx 18rpx rgba(0, 0, 0, 0.04);
}

.food-thumb {
  width: 112rpx;
  height: 112rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.food-photo,
.preview-photo {
  width: 100%;
  height: 100%;
}

.food-icon {
  font-size: 56rpx;
}

.food-info {
  flex: 1;
  min-width: 0;
}

.food-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.food-meta {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #999;
}

.food-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.edit-text {
  font-size: 26rpx;
  color: #43a047;
  font-weight: 600;
}

.delete-btn {
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: #ffebee;
  color: #c62828;
  font-size: 24rpx;
  font-weight: 600;
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

.edit-modal {
  width: 620rpx;
  background: #fff;
  border-radius: 28rpx;
  padding: 34rpx;
  box-sizing: border-box;
}

.modal-title,
.upload-hint {
  display: block;
  text-align: center;
}

.modal-title {
  font-size: 34rpx;
  font-weight: 700;
  margin-bottom: 24rpx;
}

.preview {
  width: 180rpx;
  height: 180rpx;
  border-radius: 24rpx;
  margin: 0 auto 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-icon {
  font-size: 88rpx;
}

.upload-hint {
  font-size: 24rpx;
  color: #43a047;
  margin-bottom: 22rpx;
}

.form-item {
  margin-bottom: 22rpx;
}

.form-label {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.form-input,
.picker-input {
  height: 76rpx;
  line-height: 76rpx;
  border-radius: 16rpx;
  background: #f6f6f6;
  padding: 0 22rpx;
  font-size: 28rpx;
  color: #1a1a1a;
}

.modal-actions {
  display: flex;
  gap: 18rpx;
  margin-top: 30rpx;
}

.cancel-btn,
.save-btn {
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

.save-btn {
  background: linear-gradient(145deg, #66bb6a, #43a047);
  color: #fff;
}
</style>
