/**
 * 电子书阅读器主页面
 * 功能包括：触摸翻页、自动翻页、缩略图导航、文件上传、缩放控制等
 */

// 常量配置
const CONSTANTS = {
  MAX_FILES: 50,              // 最大文件数量限制
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 最大文件大小(10MB)
  AUTO_FLIP_INTERVAL: 3000,   // 自动翻页间隔(ms)
  ZOOM_TIMER_DURATION: 2000,  // 缩略图放大效果持续时间(ms)
  FLIP_ANIMATION_DURATION: 300, // 翻页动画持续时间(ms)
  THUMBNAIL_WIDTH: 70 + 8,    // 缩略图宽度+间距(rpx)
  SAVE_SETTINGS_INTERVAL: 5,  // 保存设置的页码间隔
};

Page({
  data: {
    // ===== 页面状态 =====
    currentPage: 1,        // 当前页码
    totalPages: 114,       // 总页数
    jumpPage: '',          // 跳转页码输入框
    currentPageImage: '',  // 当前页面显示的图片
    
    // ===== 界面显示控制 =====
    showThumbnails: true,  // 是否显示缩略图
    showTopMenu: false,    // 是否显示顶部菜单
    showCircleMenu: false, // 是否显示圆形菜单
    showUploadMenu: false, // 是否显示上传菜单
    
    // ===== 功能开关 =====
    autoFlip: false,       // 自动翻页开关
    soundOn: true,         // 音效开关
    isZoomMode: false,     // 缩放模式开关
    isAnimating: false,    // 翻页动画状态
    
    // ===== 缩放控制 =====
    contentScale: 100,     // 内容缩放比例(%)
    
    // ===== 缩略图数据 =====
    thumbnails: [],        // 缩略图列表数据
    
    // ===== 文件管理 =====
    uploadedFiles: [],     // 已上传文件列表
    
    // ===== 触摸事件记录 =====
    touchStartX: 0,        // 触摸起始X坐标
    touchStartY: 0,        // 触摸起始Y坐标
    
    // ===== 缩略图滑动控制 =====
    thumbnailScrollLeft: 0,// 缩略图滚动位置
    
    // ===== 页面状态 =====
    isLoading: false,      // 是否正在加载
    
    // ===== 电子书数据 =====
    bookPages: []          // 所有页面数据
  },
  
  // ===== 定时器管理 =====
  autoFlipTimer: null,     // 自动翻页定时器
  zoomTimer: null,         // 缩略图放大效果定时器,

  /**
   * 页面加载完成
   * 初始化电子书数据、缩略图、用户设置和上传文件
   * @param {Object} options - 页面参数，可包含page页码
   */
  onLoad: function(options) {
    console.log('电子书阅读器加载完成');
    // 初始化电子书页面数据
    this.initBookPages();
    // 初始化缩略图数据
    this.initThumbnails();
    // 加载用户设置
    this.settingsManager.loadSettings(this);
    // 加载已上传文件列表
    this.fileManager.loadUploadedFiles(this);
    
    // 强制设置缩放比例为100%
    this.setData({
      contentScale: 100
    });
    
    // 保存到本地存储
    this.settingsManager.saveSettings(this);
    
    // 如果有传入的页面参数，直接跳转到指定页
    if (options.page) {
      const page = parseInt(options.page);
      if (page >= 1 && page <= this.data.totalPages) {
        this.setData({ currentPage: page });
        this.thumbnailManager.updateThumbnails(this, page);
      }
    }
  },

  /**
   * 页面渲染完成
   */
  onReady: function() {
    console.log('页面渲染完成');
  },

  /**
   * 页面显示
   * 恢复自动翻页功能
   */
  onShow: function() {
    console.log('页面显示');
    // 如果之前开启了自动翻页，重新启动
    if (this.data.autoFlip && !this.data.autoFlipTimer) {
      this.flipManager.startAutoFlip(this);
    }
  },

  /**
   * 页面隐藏
   * 保存用户设置和已上传文件
   */
  onHide: function() {
    console.log('页面隐藏');
    this.settingsManager.saveSettings(this);      // 保存用户设置
    this.fileManager.saveUploadedFiles(this); // 保存已上传文件列表
  },

  /**
   * 页面卸载
   * 清理资源并保存数据
   */
  onUnload: function() {
    this.flipManager.stopAutoFlip(this);       // 停止自动翻页
    this.clearZoomTimer();     // 清除缩放定时器
    this.settingsManager.saveSettings(this);       // 保存用户设置
    this.fileManager.saveUploadedFiles(this);  // 保存已上传文件列表
  },

  // ========== 初始化方法 ==========
  /**
   * 初始化电子书页面数据
   * 生成模拟的电子书页面列表，包含页码、标题和图片URL
   */
  initBookPages: function() {
    console.log('初始化电子书页面');
    let pages = [];
    for (let i = 1; i <= this.data.totalPages; i++) {
      pages.push({
        id: i,                    // 页面ID
        title: `第${i}页`,        // 页面标题
        // 使用占位图片，实际项目中可替换为真实图片URL
        image: `https://via.placeholder.com/600x800/667eea/ffffff?text=Page+${i}`,
        bookmark: false,          // 是否添加书签
        notes: []                 // 页面笔记
      });
    }
    this.setData({ 
      bookPages: pages,                  // 设置电子书页面列表
      currentPageImage: pages[0].image   // 设置初始显示图片
    });
  },

  /**
   * 初始化缩略图数据
   * 生成缩略图列表，最多显示20个缩略图
   */
  initThumbnails: function() {
    console.log('初始化缩略图');
    let thumbs = [];
    // 最多显示20个缩略图
    const totalThumbs = Math.min(20, this.data.totalPages);
    
    for (let i = 1; i <= totalThumbs; i++) {
      const imageUrl = (this.data.bookPages[i - 1] && this.data.bookPages[i - 1].image) ? this.data.bookPages[i - 1].image : `https://via.placeholder.com/600x800/667eea/ffffff?text=Page+${i}`;
      
      // 普通缩略图数据
      thumbs.push({
          page: i,
          active: i === this.data.currentPage,
          zoomed: false,
          image: imageUrl
        });
    }
    
    // 自动滚动到当前页面的缩略图位置
    const currentIndex = this.data.currentPage - 1;
    const scrollLeft = this.thumbnailManager.calculateScrollPosition(currentIndex, thumbs.length);
    
    // 合并setData调用，减少DOM更新次数
    this.setData({ 
      thumbnails: thumbs,
      thumbnailScrollLeft: scrollLeft
    });
  },



  /**
   * 加载用户设置
   * 从本地存储中读取用户的阅读设置，并应用到页面
   */
  loadSettings: function() {
    try {
      // 从本地存储中读取设置
      const settings = wx.getStorageSync('bookReaderSettings');
      if (settings) {
        console.log('加载用户设置:', settings);
        // 应用设置到页面
        // 处理缩放比例，确保取整
        const scale = settings.contentScale || 100;
        const roundedScale = Math.round(scale);
        
        this.setData({
          currentPage: settings.currentPage || 1,          // 当前页码
          contentScale: roundedScale,                      // 缩放比例（已四舍五入）
          soundOn: settings.soundOn !== undefined ? settings.soundOn : true, // 音效开关
          autoFlip: settings.autoFlip || false,            // 自动翻页
          showThumbnails: settings.showThumbnails !== undefined ? settings.showThumbnails : true // 显示缩略图
        });
        
        // 如果设置了自动翻页，立即启动
        if (this.data.autoFlip) {
          this.flipManager.startAutoFlip(this);
        }
      }
    } catch (e) {
      console.log('加载设置失败:', e);
    }
  },

  /**
   * 保存用户设置
   * 将当前的阅读设置保存到本地存储中
   */
  saveSettings: function() {
    try {
      // 构建设置对象
      const settings = {
        currentPage: this.data.currentPage,      // 当前页码
        contentScale: this.data.contentScale,    // 缩放比例
        soundOn: this.data.soundOn,              // 音效开关
        autoFlip: this.data.autoFlip,            // 自动翻页
        showThumbnails: this.data.showThumbnails // 显示缩略图
      };
      
      // 检查本地存储是否可用
      this.fileManager.checkStorageAvailable();
      
      // 保存到本地存储
      wx.setStorageSync('bookReaderSettings', settings);
      console.log('保存用户设置:', settings);
    } catch (e) {
      console.error('保存设置失败:', e);
      // 存储失败时，不显示错误提示，避免影响用户体验
    }
  },




  


  // ========== 图片加载处理 ==========
  onImageLoad: function(e) {
    console.log('图片加载成功:', e.detail);
  },

  onImageError: function(e) {
    console.log('图片加载失败:', e.detail);
    wx.showToast({
      title: '图片加载失败',
      icon: 'error'
    });
  },

  onThumbnailImageError: function(e) {
    console.log('缩略图图片加载失败:', e.detail);
  },

  // ========== 触摸交互功能（翻页+缩放） ==========
  /**
   * 触摸开始事件
   * 记录触摸起始位置
   * @param {Object} e - 触摸事件对象
   */
  onTouchStart: function(e) {
    // 单指触摸：记录翻页起始位置
    if (e.touches.length === 1) {
      this.setData({
        touchStartX: e.touches[0].clientX,
        touchStartY: e.touches[0].clientY
      });
    }
    // 双指触摸：记录缩放初始距离
    else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      this.setData({
        pinchStartDistance: distance,
        pinchStartScale: this.data.contentScale
      });
    }
  },

  /**
   * 触摸移动事件
   * 处理双指缩放功能
   * @param {Object} e - 触摸事件对象
   */
  onTouchMove: function(e) {
    // 只有双指触摸时才处理缩放
    if (e.touches.length === 2 && this.data.pinchStartDistance) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      // 计算当前两指之间的距离
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      // 计算缩放比例
      const scaleRatio = currentDistance / this.data.pinchStartDistance;
      let newScale = this.data.pinchStartScale * scaleRatio;
      
      // 限制缩放范围在50%-200%之间并取整
      newScale = Math.max(50, Math.min(200, newScale));
      newScale = Math.round(newScale);
      
      // 更新缩放比例
      this.setData({
        contentScale: newScale
      });
    }
  },

  /**
   * 触摸结束事件
   * 根据触摸滑动方向判断翻页方向，清除缩放相关数据
   * @param {Object} e - 触摸事件对象
   */
  onTouchEnd: function(e) {
    // 单指触摸结束：处理翻页
    if (e.changedTouches.length === 1) {
      // 直接计算滑动距离，减少setData调用
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const dx = touchEndX - this.data.touchStartX;
      const dy = touchEndY - this.data.touchStartY;
      
      // 提高滑动阈值到100rpx，减少误触，同时确保是水平滑动
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 100) {
        if (dx > 0) {
          // 向右滑动 - 翻到上一页
          this.flipManager.prevPage(this);
        } else {
          // 向左滑动 - 翻到下一页
          this.flipManager.nextPage(this);
        }
      }
    }
    // 双指触摸结束：清除缩放相关数据
    else {
      this.setData({
        pinchStartDistance: null,
        pinchStartScale: null
      });
    }
  },



  // ========== 翻页管理模块 ==========
  // 翻页控制相关功能
  flipManager: {
    /**
     * 翻到上一页
     * @param {Object} context - 页面上下文
     */
    prevPage: function(context) {
      // 检查是否可以翻页：不是第一页且不在动画中
      if (context.data.currentPage > 1 && !context.data.isAnimating) {
        const newPage = context.data.currentPage - 1; // 计算新页码
        
        // 设置动画状态
        context.setData({
          isAnimating: true,
          swipeDirection: 'right'
        });
          
        // 播放翻页音效
        context.audioManager.playPageSound(context);
        
        // 更新缩略图状态
        const thumbnails = context.thumbnailManager.updateThumbnails(context, newPage);
          
        // 计算滚动位置
        const scrollLeft = (newPage - 1 - 2) * (70 + 8);
          
        // 使用setTimeout模拟翻页动画效果
        setTimeout(() => {
          context.setData({
            currentPage: newPage,                 // 更新当前页码
            currentPageImage: context.data.bookPages[newPage - 1].image, // 更新当前页面图片
            thumbnails: thumbnails,               // 更新缩略图状态
            thumbnailScrollLeft: Math.max(0, scrollLeft), // 滚动缩略图到当前页位置
            isAnimating: false                    // 动画结束
          });
            
          context.settingsManager.saveSettings(context); // 保存当前页码设置
        }, CONSTANTS.FLIP_ANIMATION_DURATION);
      }
    },
    
    /**
     * 翻到下一页
     * @param {Object} context - 页面上下文
     */
    nextPage: function(context) {
      // 检查是否可以翻页：不是最后一页且不在动画中
      if (context.data.currentPage < context.data.totalPages && !context.data.isAnimating) {
        const newPage = context.data.currentPage + 1; // 计算新页码
        
        // 设置动画状态
        context.setData({
          isAnimating: true,
          swipeDirection: 'left'
        });
          
        // 播放翻页音效
        context.audioManager.playPageSound(context);
        
        // 更新缩略图状态
        const thumbnails = context.thumbnailManager.updateThumbnails(context, newPage);
          
        // 计算滚动位置
        const scrollLeft = (newPage - 1 - 2) * (70 + 8);
          
        // 使用setTimeout模拟翻页动画效果
        setTimeout(() => {
          context.setData({
            currentPage: newPage,                 // 更新当前页码
            currentPageImage: context.data.bookPages[newPage - 1].image, // 更新当前页面图片
            thumbnails: thumbnails,               // 更新缩略图状态
            thumbnailScrollLeft: Math.max(0, scrollLeft), // 滚动缩略图到当前页位置
            isAnimating: false                    // 动画结束
          });
            
          context.settingsManager.saveSettings(context); // 保存当前页码设置
        }, CONSTANTS.FLIP_ANIMATION_DURATION);
      }
    },
    
    /**
     * 启动自动翻页功能
     * @param {Object} context - 页面上下文
     */
    startAutoFlip: function(context) {
      // 如果已经有定时器，先清除
      if (context.autoFlipTimer) {
        context.flipManager.stopAutoFlip(context);
      }
      
      // 设置自动翻页定时器
      context.autoFlipTimer = setInterval(() => {
        // 如果是最后一页，停止自动翻页
        if (context.data.currentPage < context.data.totalPages) {
          context.flipManager.nextPage(context);
        } else {
          context.flipManager.stopAutoFlip(context);
          // 显示提示
          wx.showToast({
            title: '已到最后一页',
            icon: 'none',
            duration: 1500
          });
        }
      }, context.data.autoFlipInterval || CONSTANTS.AUTO_FLIP_INTERVAL);
      
      console.log('自动翻页已启动');
    },
    
    /**
     * 停止自动翻页功能
     * @param {Object} context - 页面上下文
     */
    stopAutoFlip: function(context) {
      if (context.autoFlipTimer) {
        clearInterval(context.autoFlipTimer);
        context.autoFlipTimer = null;
        console.log('自动翻页已停止');
      }
    }
  },
  
  // ========== 缩略图管理模块 ==========
  // 缩略图管理相关功能
  thumbnailManager: {
    /**
     * 处理缩略图点击事件
     * 点击缩略图跳转到对应页码，并显示放大效果
     * @param {Object} e - 点击事件对象，包含页码和索引信息
     * @param {Object} context - 页面上下文
     */
    handleTap: function(e, context) {
      const page = e.currentTarget.dataset.page; // 获取点击的页码
      const index = e.currentTarget.dataset.index; // 获取点击的索引
      
      // 清除之前的所有放大效果并设置当前点击的缩略图为放大状态
      const thumbnails = context.data.thumbnails.map((item, i) => ({
        ...item,
        zoomed: i === index,
        active: i === index || item.page === page // 更新激活状态
      }));
      
      // 清除之前的缩放定时器
      context.clearZoomTimer();
      
      // 如果点击的不是当前页，则跳转到对应页
      if (page !== context.data.currentPage) {
        // 计算缩略图滚动位置，使点击的缩略图居中显示
        const scrollLeft = context.thumbnailManager.calculateScrollPosition(index, thumbnails.length);
        
        // 合并setData调用，减少渲染次数
        context.setData({
          thumbnails: thumbnails,                          // 更新缩略图状态
          currentPage: page,                                // 更新当前页码
          currentPageImage: context.data.bookPages[page - 1].image, // 更新当前页面图片
          thumbnailScrollLeft: scrollLeft                   // 滚动缩略图到当前页位置
        });
        
        // 如果开启了音效，播放点击音效
        if (context.data.soundOn) {
          context.audioManager.playSound(context, 'click');
        }
        
        context.settingsManager.saveSettings(context); // 保存当前页码设置
        
        // 显示提示信息
        wx.showToast({
          title: `第${page}页`,
          icon: 'none',
          duration: 800
        });
      } else {
        // 只更新放大效果
        context.setData({ thumbnails });
      }
      
      // 设置2秒后自动取消放大效果
      context.zoomTimer = setTimeout(() => {
        const resetThumbnails = context.data.thumbnails.map(item => ({
          ...item,
          zoomed: false
        }));
        context.setData({ thumbnails: resetThumbnails });
      }, CONSTANTS.ZOOM_TIMER_DURATION);
    },
    
    /**
     * 计算缩略图滚动位置
     * @param {number} index - 点击的缩略图索引
     * @param {number} totalThumbs - 缩略图总数
     * @returns {number} - 计算的滚动位置
     */
    calculateScrollPosition: function(index, totalThumbs) {
      const thumbWidth = CONSTANTS.THUMBNAIL_WIDTH;
      const containerWidth = 750; // 假设屏幕宽度为750rpx
      const visibleThumbs = Math.floor(containerWidth / thumbWidth); // 可见缩略图数量
      const centerOffset = Math.floor(visibleThumbs / 2); // 居中偏移量
      
      // 计算滚动位置，确保不小于0且不超过最大滚动位置
      let scrollLeft = (index - centerOffset) * thumbWidth;
      const maxScrollLeft = Math.max(0, (totalThumbs - visibleThumbs + 1) * thumbWidth);
      scrollLeft = Math.max(0, Math.min(scrollLeft, maxScrollLeft));
      
      return scrollLeft;
    },
    
    /**
     * 更新缩略图状态
     * 将当前页码对应的缩略图标记为激活状态
     * @param {Object} context - 页面上下文
     * @param {number} currentPage - 当前页码
     */
    updateThumbnails: function(context, currentPage) {
      const thumbnails = context.data.thumbnails.map(item => ({
        ...item,
        active: item.page === currentPage // 设置当前页缩略图为激活状态
      }));
      return thumbnails;
    }
  },

  /**
   * 清除缩放定时器
   * 防止定时器内存泄漏
   */
  clearZoomTimer: function() {
    if (this.zoomTimer) {
      clearTimeout(this.zoomTimer);
      this.zoomTimer = null;
    }
  },

  // ========== 缩略图桥接方法 ==========
  /**
   * 处理缩略图点击事件（桥接方法）
   * @param {Object} e - 点击事件对象，包含页码和索引信息
   */
  onThumbnailTap: function(e) {
    this.thumbnailManager.handleTap(e, this);
  },

  /**
   * 切换缩略图显示/隐藏状态
   */
  toggleThumbnails: function() {
    const newState = !this.data.showThumbnails;
    this.setData({ showThumbnails: newState });
    wx.showToast({
      title: newState ? '显示缩略图' : '隐藏缩略图',
      icon: 'none'
    });
    this.saveSettings(); // 保存状态到本地存储
  },

  // ========== 文件管理模块 ==========
  // 文件上传和管理相关功能
  fileManager: {
    /**
     * 显示上传菜单
     * 打开文件上传菜单，同时关闭其他菜单
     * @param {Object} context - 页面上下文
     */
    showUploadMenu: function(context) {
      context.setData({
        showUploadMenu: true,   // 显示上传菜单
        showCircleMenu: false,  // 关闭圆形菜单
        showTopMenu: false      // 关闭顶部菜单
      });
    },
    
    /**
     * 关闭上传菜单
     * @param {Object} context - 页面上下文
     */
    closeUploadMenu: function(context) {
      context.setData({ showUploadMenu: false });
    },
    
    /**
     * 上传文件
     * 根据选择的文件类型打开文件选择器
     * @param {Object} context - 页面上下文
     * @param {Object} e - 点击事件对象，包含文件类型
     */
    uploadFile: function(context, e) {
      const fileType = e.currentTarget.dataset.type; // 获取文件类型
      console.log('上传文件类型:', fileType);
      
      context.setData({ showUploadMenu: false }); // 关闭上传菜单
      
      // 图片类型使用专门的图片选择API
      if (fileType === 'image') {
        wx.chooseImage({
          count: 9,                // 最多选择9个图片
          sizeType: ['original', 'compressed'],  // 原图或压缩图
          sourceType: ['album', 'camera'],       // 相册或相机
          success: (res) => {      // 选择图片成功回调
            console.log('选择图片成功:', res);
            // 处理多张图片
            const tempFiles = res.tempFiles;
            
            // 显示上传中状态
            wx.showLoading({
              title: `正在上传 ${tempFiles.length} 张图片...`,
              mask: true
            });
            
            // 依次处理每张图片
            let uploadedCount = 0;
            const totalCount = tempFiles.length;
            const initialTotalPages = context.data.totalPages;
            
            tempFiles.forEach((tempFile, index) => {
              // 构建文件对象
              const file = {
                name: `image_${Date.now()}_${index}.${tempFile.path.split('.').pop()}`, // 生成带索引的文件名
                size: tempFile.size,  // 文件大小
                path: tempFile.path   // 临时文件路径
              };
              
              // 处理文件上传
              context.fileManager.handleFileUpload(context, file, fileType, () => {
                uploadedCount++;
                
                // 所有图片上传完成
                if (uploadedCount === totalCount) {
                  // 更新缩略图
                  context.initThumbnails();
                  
                  // 跳转到第一张上传的图片页
                  if (tempFiles.length > 0) {
                    const firstNewPage = initialTotalPages + 1;
                    // 直接从bookPages数组中获取图片路径，避免重复的setData调用
                    const imagePath = context.data.bookPages[firstNewPage - 1].image;
                    context.setData({
                      currentPage: firstNewPage,
                      currentPageImage: imagePath
                    });
                  }
                  
                  wx.hideLoading();
                  wx.showToast({
                    title: `上传成功 ${totalCount} 张图片`,
                    icon: 'success',
                    duration: 2000
                  });
                }
              });
            });
          },
          fail: (err) => {         // 选择图片失败回调
            console.log('选择图片失败:', err);
            wx.showToast({
              title: '选择图片失败',
              icon: 'none'
            });
          }
        });
      } else {
        // 非图片类型使用普通文件选择器
        // 根据文件类型获取允许的扩展名
        const extensions = context.fileManager.getExtensionsByType(fileType);
        
        // 打开微信文件选择器
        wx.chooseMessageFile({
          count: 1,                // 最多选择1个文件
          type: 'file',            // 文件类型
          extension: extensions,   // 允许的扩展名
          success: (res) => {      // 选择文件成功回调
            console.log('选择文件成功:', res);
            const file = res.tempFiles[0]; // 获取第一个文件
            context.fileManager.handleFileUpload(context, file, fileType); // 处理文件上传
          },
          fail: (err) => {         // 选择文件失败回调
            console.log('选择文件失败:', err);
            wx.showToast({
              title: '选择文件失败',
              icon: 'none'
            });
          }
        });
      }
    },
    
    /**
     * 根据文件类型获取允许的扩展名
     * @param {string} type - 文件类型
     * @returns {Array} - 允许的扩展名数组
     */
    getExtensionsByType: function(type) {
      // 定义不同文件类型对应的扩展名
      const extensions = {
        'pdf': ['pdf'],
        'word': ['doc', 'docx'],
        'excel': ['xls', 'xlsx', 'csv'],
        'ppt': ['ppt', 'pptx'],
        'image': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
        'txt': ['txt'],
        'all': ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'txt', 'csv', 'webp']
      };
      
      // 返回对应类型的扩展名，默认返回所有类型
      return extensions[type] || extensions['all'];
    },
    
    /**
     * 处理文件上传
     * 将文件信息添加到已上传文件列表
     * @param {Object} context - 页面上下文
     * @param {Object} file - 文件对象
     * @param {string} fileType - 文件类型
     * @param {Function} callback - 上传完成回调
     */
    handleFileUpload: function(context, file, fileType, callback) {
      // 参数验证
      if (!file || !file.path || !file.name) {
        wx.showToast({
          title: '文件信息无效',
          icon: 'error'
        });
        if (callback) callback();
        return;
      }
      
      // 文件大小限制(10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        wx.showToast({
          title: '文件大小不能超过10MB',
          icon: 'none'
        });
        if (callback) callback();
        return;
      }
      
      console.log('处理文件上传:', file);
      
      const fileName = file.name; // 获取文件名
      // 计算文件大小(MB)
      const fileSize = (file.size / 1024 / 1024).toFixed(2);
      
      // 使用wx.saveFile保存文件到持久化路径
      wx.saveFile({
        tempFilePath: file.path,
        success: function(res) {
          // 创建新的文件对象，使用持久化路径
          const newFile = {
            id: Date.now(),               // 唯一ID(时间戳)
            name: fileName,               // 文件名
            type: fileType,               // 文件类型
            size: fileSize,               // 文件大小(MB)
            path: res.savedFilePath,      // 文件持久化路径
            uploadTime: new Date().toLocaleString() // 上传时间
          };
          
          try {
            // 添加到已上传文件列表(新文件放在最前面)
            const uploadedFiles = [newFile, ...context.data.uploadedFiles];
            context.setData({ uploadedFiles }); // 更新文件列表
            context.fileManager.saveUploadedFiles(context); // 保存到本地存储
            
            // 对于图片类型，添加到书籍页面数据中
            if (fileType === 'image') {
              // 计算新页码
              const newPageNumber = context.data.totalPages + 1;
              
              // 添加到书籍页面数据中，作为新的一页
              const newBookPages = [...context.data.bookPages, { 
                id: newPageNumber, 
                title: `上传图片页 ${newPageNumber}`, 
                image: newFile.path,
                bookmark: false,
                notes: []
              }];
              
              // 合并状态更新，减少闪烁
              const updateData = {
                bookPages: newBookPages,
                totalPages: newPageNumber
              };
              
              // 如果是第一张上传的图片，设置为当前显示图片
              if (context.data.totalPages === 1) {
                updateData.currentPageImage = newFile.path;
                updateData.currentPage = newPageNumber;
              }
              
              // 一次性更新所有状态
              context.setData(updateData);
            }
            
            // 调用回调函数通知上传完成
            if (callback) callback();
          } catch (error) {
            console.error('文件上传处理失败:', error);
            wx.showToast({
              title: '上传失败，请重试',
              icon: 'error'
            });
            if (callback) callback();
          }
        },
        fail: function(err) {
          console.error('保存文件失败:', err);
          wx.showToast({
            title: '文件保存失败，请重试',
            icon: 'error'
          });
          if (callback) callback();
        }
      });
    },
    
    /**
     * 打开文件管理器
     * 显示已上传的文件列表，支持预览和删除功能
     * @param {Object} context - 页面上下文
     */
    openFileManager: function(context) {
      if (context.data.uploadedFiles.length === 0) {
        wx.showModal({
          title: '文件管理',
          content: '暂无已上传的文件',
          showCancel: false,
          confirmText: '知道了'
        });
      } else {
        const fileList = context.data.uploadedFiles;
        const actionList = fileList.map(file => 
          `${context.fileManager.getFileIcon(file.type)} ${file.name.substring(0, 15)}${file.name.length > 15 ? '...' : ''}`
        );
        
        wx.showActionSheet({
          itemList: actionList,
          success: (res) => {
            const index = res.tapIndex;
            if (index >= 0) {
              const file = fileList[index];
              context.fileManager.showFileOptions(context, file, index);
            }
          }
        });
      }
      
      context.setData({ showCircleMenu: false });
    },
    
    /**
     * 显示文件操作选项
     * 提供预览和删除文件的选项
     * @param {Object} context - 页面上下文
     * @param {Object} file - 文件对象
     * @param {number} index - 文件在列表中的索引
     */
    showFileOptions: function(context, file, index) {
      wx.showActionSheet({
        itemList: ['预览文件', '删除文件'],
        success: (res) => {
          if (res.tapIndex === 0) {
            // 预览文件
            context.fileManager.previewFile(context, file);
          } else if (res.tapIndex === 1) {
            // 删除文件
            context.fileManager.deleteFile(context, index);
          }
        }
      });
    },
    
    /**
     * 删除文件
     * 从已上传文件列表中删除指定文件
     * @param {Object} context - 页面上下文
     * @param {number} index - 文件在列表中的索引
     */
    deleteFile: function(context, index) {
      wx.showModal({
        title: '删除确认',
        content: '确定要删除该文件吗？',
        showCancel: true,
        cancelText: '取消',
        confirmText: '删除',
        confirmColor: '#ff3b30',
        success: (res) => {
          if (res.confirm) {
            // 删除文件并更新列表
            const updatedFiles = [...context.data.uploadedFiles];
            updatedFiles.splice(index, 1);
            
            context.setData({ uploadedFiles: updatedFiles });
            context.fileManager.saveUploadedFiles(context);
            
            wx.showToast({
              title: '文件已删除',
              icon: 'success',
              duration: 1500
            });
          }
        }
      });
    },
    
    /**
     * 根据文件类型获取对应的图标
     * @param {string} type - 文件类型
     * @returns {string} - 对应文件类型的emoji图标
     */
    getFileIcon: function(type) {
      const icons = {
        'pdf': '📕',
        'word': '📘',
        'excel': '📗',
        'ppt': '📙',
        'image': '🖼️',
        'txt': '📄'
      };
      return icons[type] || '📁';
    },
    
    /**
     * 预览文件
     * 显示文件信息并提供打开文件的选项
     * @param {Object} context - 页面上下文
     * @param {Object} file - 文件对象，包含文件名、路径、类型等信息
     */
    previewFile: function(context, file) {
      // 参数验证
      if (!file || !file.path) {
        wx.showToast({
          title: '文件信息无效',
          icon: 'error'
        });
        return;
      }
      
      wx.showModal({
        title: '文件信息',
        content: `文件名: ${file.name || '未知'}\n类型: ${file.type || '未知'}\n大小: ${file.size || '0'}MB\n上传时间: ${file.uploadTime || '未知'}`,
        showCancel: true,
        cancelText: '关闭',
        confirmText: '打开',
        success: (res) => {
          if (res.confirm) {
            wx.showLoading({
              title: '打开文件中...',
              mask: true
            });
            
            // 图片类型使用专门的图片预览API
            if (file.type === 'image') {
              wx.previewImage({
                urls: [file.path],
                current: file.path,
                success: () => {
                  console.log('图片预览成功');
                  wx.hideLoading();
                },
                fail: (err) => {
                  console.error('图片预览失败:', err);
                  wx.hideLoading();
                  wx.showToast({
                    title: '无法预览图片',
                    icon: 'none'
                  });
                }
              });
            } else {
              // 非图片类型使用文档打开API
              wx.openDocument({
                filePath: file.path,
                success: () => {
                  console.log('打开文档成功');
                  wx.hideLoading();
                },
                fail: (err) => {
                  console.error('打开文档失败:', err);
                  wx.hideLoading();
                  wx.showToast({
                    title: '无法打开此文件',
                    icon: 'none'
                  });
                },
                complete: () => {
                  // 确保隐藏加载状态
                  wx.hideLoading();
                }
              });
            }
          }
        },
        fail: (err) => {
          console.error('显示文件信息失败:', err);
          wx.showToast({
            title: '操作失败',
            icon: 'error'
          });
        }
      });
    },
    
    /**
     * 显示最近上传的文件
     * 最多显示5个最近上传的文件列表
     * @param {Object} context - 页面上下文
     */
    showRecentFiles: function(context) {
      if (context.data.uploadedFiles.length === 0) {
        wx.showToast({
          title: '暂无最近文件',
          icon: 'none'
        });
      } else {
        const recentFiles = context.data.uploadedFiles.slice(0, 5);
        let content = '最近文件:\n\n';
        recentFiles.forEach((file, index) => {
          const icon = context.fileManager.getFileIcon(file.type);
          content += `${index + 1}. ${icon} ${file.name}\n`;
        });
        
        wx.showModal({
          title: '最近文件',
          content: content,
          showCancel: false,
          confirmText: '确定'
        });
      }
      
      context.setData({ showCircleMenu: false });
    },
    
    /**
     * 加载已上传文件
     * 从本地存储中读取已上传的文件列表
     * @param {Object} context - 页面上下文
     */
    loadUploadedFiles: function(context) {
      try {
        // 从本地存储中读取文件列表
        const files = wx.getStorageSync('uploadedFiles');
        if (files) {
          context.setData({ uploadedFiles: files });
          console.log('加载已上传文件:', files.length, '个');
        }
      } catch (e) {
        console.log('加载文件列表失败:', e);
      }
    },
    
    /**
     * 检查本地存储是否可用
     * 获取本地存储信息并检查剩余空间
     * @returns {boolean} - 本地存储是否可用
     */
    checkStorageAvailable: function() {
      try {
        // 获取本地存储信息
        wx.getStorageInfoSync();
        return true;
      } catch (e) {
        console.error('本地存储不可用:', e);
        return false;
      }
    },
    
    /**
     * 保存已上传文件列表
     * 将当前的文件列表保存到本地存储中
     * @param {Object} context - 页面上下文
     */
    saveUploadedFiles: function(context) {
      try {
        // 检查本地存储是否可用
        if (!context.fileManager.checkStorageAvailable()) {
          return;
        }
        
        // 限制文件列表大小，最多保存50个文件
        const maxFiles = 50;
        const filesToSave = context.data.uploadedFiles.slice(0, maxFiles);
        
        // 保存到本地存储
        wx.setStorageSync('uploadedFiles', filesToSave);
        console.log('保存已上传文件:', filesToSave.length, '个');
        
        // 如果文件数量超过限制，显示提示
        if (context.data.uploadedFiles.length > maxFiles) {
          wx.showToast({
            title: `文件数量超过限制，仅保存最近${maxFiles}个文件`,
            icon: 'none',
            duration: 2000
          });
        }
      } catch (e) {
        console.error('保存文件列表失败:', e);
        // 存储失败时，不显示错误提示，避免影响用户体验
      }
    }
  },
  
  // ========== 智能缩放功能 ==========
  /**
   * 切换缩放模式
   * 在放大和缩小模式之间切换，每次调整20%
   */
  toggleZoom: function() {
    const newZoomMode = !this.data.isZoomMode; // 切换缩放模式
    let newScale = this.data.contentScale;     // 初始化新的缩放比例
    
    if (newZoomMode) {
      // 缩小模式：每次缩小20%，最小50%
      newScale = Math.max(50, this.data.contentScale - 20);
    } else {
      // 放大模式：每次放大20%，最大200%
      newScale = Math.min(200, this.data.contentScale + 20);
    }
    // 取整
    newScale = Math.round(newScale);
    
    this.setData({
      isZoomMode: newZoomMode, // 更新缩放模式
      contentScale: newScale   // 更新缩放比例
    });
    
    // 显示缩放提示
    wx.showToast({
      title: `${newZoomMode ? '缩小' : '放大'}到${newScale}%`,
      icon: 'none',
      duration: 800
    });
    
    this.settingsManager.saveSettings(this); // 保存缩放设置
  },
  
  // ========== 文件管理桥接方法 ==========
  /**
   * 显示上传菜单（桥接方法）
   */
  showUploadMenu: function() {
    this.fileManager.showUploadMenu(this);
  },
  
  /**
   * 关闭上传菜单（桥接方法）
   */
  closeUploadMenu: function() {
    this.fileManager.closeUploadMenu(this);
  },
  
  /**
   * 上传文件（桥接方法）
   * @param {Object} e - 点击事件对象，包含文件类型
   */
  uploadFile: function(e) {
    this.fileManager.uploadFile(this, e);
  },
  
  /**
   * 打开文件管理器（桥接方法）
   */
  openFileManager: function() {
    this.fileManager.openFileManager(this);
  },
  
  /**
   * 显示最近上传的文件（桥接方法）
   */
  showRecentFiles: function() {
    this.fileManager.showRecentFiles(this);
  },
  
  // ========== 缩略图桥接方法 ==========
  /**
   * 处理缩略图点击事件（桥接方法）
   * @param {Object} e - 点击事件对象，包含页码和索引信息
   */
  onThumbnailTap: function(e) {
    this.thumbnailManager.handleTap(e, this);
  },



  // ========== 缩略图显示控制 ==========
  /**
   * 切换缩略图显示状态
   * 在显示和隐藏缩略图之间切换
   */
  toggleThumbnails: function() {
    const newState = !this.data.showThumbnails;
    this.setData({ showThumbnails: newState });
    
    wx.showToast({
      title: newState ? '显示缩略图' : '隐藏缩略图',
      icon: 'none',
      duration: 800
    });
    
    this.settingsManager.saveSettings(this);
  },

  // ========== 页面跳转 ==========
  /**
   * 页码输入事件
   * 处理用户输入的页码
   * @param {Object} e - 输入事件对象，包含用户输入的页码值
   */
  onJumpInput: function(e) {
    this.setData({ jumpPage: e.detail.value });
  },

  /**
   * 执行页码跳转
   * 跳转到用户输入的指定页码
   */
  doJump: function() {
    const page = parseInt(this.data.jumpPage);
    
    if (!isNaN(page) && page >= 1 && page <= this.data.totalPages) {
      // 更新缩略图状态
      const thumbnails = this.thumbnailManager.updateThumbnails(this, page);
      // 计算缩略图滚动位置
      const currentIndex = page - 1;
      const scrollLeft = this.thumbnailManager.calculateScrollPosition(currentIndex, this.data.thumbnails.length);
      
      this.setData({
        currentPage: page,
        jumpPage: '',
        currentPageImage: this.data.bookPages[page - 1].image,
        thumbnails: thumbnails,
        thumbnailScrollLeft: scrollLeft
      });
      
      this.settingsManager.saveSettings(this);
      
      wx.showToast({
        title: `跳转到第${page}页`,
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: `请输入1-${this.data.totalPages}之间的页码`,
        icon: 'none'
      });
    }
  },

  // ========== 顶部功能 ==========
  /**
   * 处理关闭阅读器
   * 弹出确认对话框，确认后退出阅读页面
   */
  handleClose: function() {
    wx.showModal({
      title: '关闭阅读器',
      content: '确定要退出电子书阅读吗？',
      confirmColor: '#ff3b30',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack();
        }
      }
    });
  },

  /**
   * 切换顶部菜单显示状态
   * 在显示和隐藏顶部菜单之间切换，同时关闭其他菜单
   */
  toggleTopMenu: function() {
    this.setData({
      showTopMenu: !this.data.showTopMenu,
      showCircleMenu: false,
      showUploadMenu: false
    });
  },

  /**
   * 关闭顶部菜单
   */
  closeTopMenu: function() {
    this.setData({ showTopMenu: false });
  },

  // ========== 其他功能 ==========
  /**
   * 处理文本编辑功能
   * 显示文本编辑选项，如字体大小、颜色等
   */
  handleTextEdit: function() {
    wx.showActionSheet({
      itemList: ['字体大小', '字体颜色', '背景颜色'],
      success: (res) => {
        const actions = ['调整字体大小', '修改字体颜色', '更换背景颜色'];
        wx.showToast({
          title: actions[res.tapIndex],
          icon: 'none'
        });
      }
    });
    this.setData({ showTopMenu: false });
  },

  /**
   * 处理搜索功能
   * 显示搜索功能说明
   */
  handleSearchFunc: function() {
    wx.showModal({
      title: '搜索功能',
      content: '在电子书中搜索关键字，快速定位内容。',
      showCancel: false,
      confirmText: '确定'
    });
    this.setData({ showTopMenu: false });
  },

  /**
   * 处理阅读设置
   * 显示阅读设置提示
   */
  handleSettings: function() {
    wx.showToast({
      title: '阅读设置',
      icon: 'none'
    });
    this.setData({ showTopMenu: false });
  },

  /**
   * 处理分享功能
   * 显示分享选项菜单
   */
  handleShare: function() {
    wx.showActionSheet({
      itemList: ['分享给朋友', '生成海报', '复制链接'],
      success: (res) => {
        const actions = ['分享给朋友', '生成海报', '复制链接'];
        wx.showToast({
          title: actions[res.tapIndex],
          icon: 'none'
        });
      }
    });
  },

  // ========== 圆圈菜单控制 ==========
  /**
   * 切换圆形菜单显示状态
   * 在显示和隐藏圆形菜单之间切换，同时关闭其他菜单
   */
  toggleCircleMenu: function() {
    this.setData({
      showCircleMenu: !this.data.showCircleMenu,
      showTopMenu: false,
      showUploadMenu: false
    });
  },

  /**
   * 关闭圆形菜单
   */
  closeCircleMenu: function() {
    this.setData({ showCircleMenu: false });
  },

  /**
   * 阻止事件冒泡
   * 防止点击子元素时触发父元素的点击事件
   * @param {Object} e - 事件对象
   */
  stopPropagation: function(e) {
    // 阻止事件冒泡
    return;
  },

  // ========== 音频管理模块 ==========
  // 音频播放相关功能
  audioManager: {
    /**
     * 初始化音频上下文
     */
    initAudio: function() {
      if (!this.innerAudioContext) {
        this.innerAudioContext = wx.createInnerAudioContext();
        // 设置音频自动播放（微信小程序中可能需要用户交互后才能播放）
        this.innerAudioContext.autoplay = false;
        // 设置循环播放
        this.innerAudioContext.loop = false;
        // 设置音量
        this.innerAudioContext.volume = 0.5;
      }
    },
    
    /**
     * 播放翻页音效
     * 在翻页时播放音效
     * @param {Object} context - 页面上下文
     */
    playPageSound: function(context) {
      // 只有在音效开启状态下才播放
      if (context.data.soundOn) {
        try {
          // 初始化音频上下文
          this.initAudio();
          // 设置翻页音效的本地路径
          this.innerAudioContext.src = '/audio/page_turn.mp3'; // 使用本地路径
          
          // 监听播放错误
          this.innerAudioContext.onError(function(err) {
            console.error('翻页音效播放错误:', err);
            // 错误时不影响其他功能，只记录日志
          });
          
          // 监听播放成功
          this.innerAudioContext.onPlay(function() {
            console.log('翻页音效播放成功');
          });
          
          // 播放音效
          this.innerAudioContext.play();
        } catch (error) {
          console.error('播放翻页音效失败:', error);
          // 捕获异常，确保不影响其他功能
        }
      }
    },
    
    /**
     * 播放指定类型的音效
     * @param {Object} context - 页面上下文
     * @param {string} type - 音效类型，如'click'等
     */
    playSound: function(context, type) {
      // 参数验证
      if (!type || typeof type !== 'string') {
        console.error('音效类型无效');
        return;
      }
      
      // 只有在音效开启状态下才播放
      if (context.data.soundOn) {
        try {
          // 初始化音频上下文
          this.initAudio();
          // 根据音效类型设置不同的音频文件
          let audioSrc = '';
          switch (type) {
            case 'click':
              audioSrc = '/audio/click.mp3';
              break;
            default:
              audioSrc = '/audio/click.mp3';
          }
          
          this.innerAudioContext.src = audioSrc;
          // 播放音效
          this.innerAudioContext.play();
          console.log(`播放${type}音效`);
        } catch (error) {
          console.error(`播放${type}音效失败:', error`);
        }
      }
    }
  },
  

  
  // ========== 通用工具模块 ==========
  // 通用工具函数
  utilsManager: {
    /**
     * 验证页码是否有效
     * @param {number} page - 页码
     * @param {number} totalPages - 总页数
     * @returns {boolean} - 页码是否有效
     */
    isValidPage: function(page, totalPages) {
      return typeof page === 'number' && !isNaN(page) && page >= 1 && page <= totalPages;
    },
    
    /**
     * 生成页面图片URL
     * @param {number} page - 页码
     * @returns {string} - 页面图片URL
     */
    generatePageImage: function(page) {
      return `https://via.placeholder.com/600x800/667eea/ffffff?text=Page+${page}`;
    },
    
    /**
     * 显示提示信息
     * @param {string} title - 提示标题
     * @param {string} icon - 图标类型
     * @param {number} duration - 显示时长(ms)
     */
    showToast: function(title, icon = 'none', duration = 1500) {
      wx.showToast({
        title,
        icon,
        duration
      });
    },
    
    /**
     * 计算缩略图滚动位置
     * @param {number} currentPage - 当前页码
     * @param {number} thumbWidth - 缩略图宽度+间距
     * @param {number} offset - 偏移量
     * @returns {number} - 滚动位置
     */
    calculateScrollPosition: function(currentPage, thumbWidth, offset = 2) {
      return Math.max(0, (currentPage - 1 - offset) * thumbWidth);
    }
  },
  
  // ========== 设置管理模块 ==========
  // 设置相关功能
  settingsManager: {
    /**
     * 加载用户设置
     * 从本地存储中读取用户的阅读设置，并应用到页面
     * @param {Object} context - 页面上下文
     */
    loadSettings: function(context) {
      try {
        // 从本地存储中读取设置
        const settings = wx.getStorageSync('bookReaderSettings');
        if (settings) {
          console.log('加载用户设置:', settings);
          // 处理缩放比例，确保取整
          const scale = settings.contentScale || 100;
          const roundedScale = Math.round(scale);
          
          // 应用设置到页面
          context.setData({
            currentPage: settings.currentPage || 1,          // 当前页码
            contentScale: roundedScale,                      // 缩放比例（已四舍五入）
            soundOn: settings.soundOn !== undefined ? settings.soundOn : true, // 音效开关
            autoFlip: settings.autoFlip || false,            // 自动翻页
            showThumbnails: settings.showThumbnails !== undefined ? settings.showThumbnails : true // 显示缩略图
          });
          
          // 如果设置了自动翻页，立即启动
          if (settings.autoFlip) {
            context.flipManager.startAutoFlip(context);
          }
        }
      } catch (e) {
        console.log('加载设置失败:', e);
      }
    },
    
    /**
     * 保存用户设置
     * 将当前的阅读设置保存到本地存储中
     * @param {Object} context - 页面上下文
     */
    saveSettings: function(context) {
      try {
        // 构建设置对象
        const settings = {
          currentPage: context.data.currentPage,      // 当前页码
          contentScale: context.data.contentScale,    // 缩放比例
          soundOn: context.data.soundOn,              // 音效开关
          autoFlip: context.data.autoFlip,            // 自动翻页
          showThumbnails: context.data.showThumbnails // 显示缩略图
        };
        
        // 检查本地存储是否可用
        context.fileManager.checkStorageAvailable();
        
        // 保存到本地存储
        wx.setStorageSync('bookReaderSettings', settings);
        console.log('保存用户设置:', settings);
      } catch (e) {
        console.error('保存设置失败:', e);
        // 存储失败时，不显示错误提示，避免影响用户体验
      }
    }
  },
  
  // ========== 圆圈菜单功能 ==========
  /**
   * 分享海报功能
   * 生成并保存分享海报到相册
   */
  sharePoster: function() {
    wx.showToast({
      title: '生成分享海报中...',
      icon: 'loading',
      duration: 1500
    });
    setTimeout(() => {
      wx.showToast({
        title: '分享海报已保存到相册',
        icon: 'success'
      });
    }, 1500);
    this.setData({ showCircleMenu: false });
  },

  /**
   * 分享二维码功能
   * 生成电子书的访问二维码
   */
  shareQRCode: function() {
    wx.showToast({
      title: '生成二维码中...',
      icon: 'loading',
      duration: 1500
    });
    setTimeout(() => {
      wx.showModal({
        title: '二维码已生成',
        content: '扫描二维码即可访问此电子书',
        showCancel: false,
        confirmText: '确定'
      });
    }, 1500);
    this.setData({ showCircleMenu: false });
  },

  /**
   * 更多分享选项
   * 显示多种分享平台选项
   */
  shareMore: function() {
    wx.showActionSheet({
      itemList: ['微信', 'QQ', '微博', '复制链接'],
      success: (res) => {
        const platforms = ['微信', 'QQ', '微博', '复制链接'];
        wx.showToast({
          title: `分享到${platforms[res.tapIndex]}`,
          icon: 'none'
        });
        
        if (res.tapIndex === 3) {
          // 复制链接
          wx.setClipboardData({
            data: 'https://book.yunzhan365.com/ai-plus-45',
            success: () => {
              wx.showToast({
                title: '链接已复制',
                icon: 'success'
              });
            }
          });
        }
      }
    });
    this.setData({ showCircleMenu: false });
  },

  /**
   * 切换自动翻页功能
   * 开启或关闭自动翻页功能
   * @param {Object} e - 开关事件对象，包含开关状态
   */
  toggleAutoFlip: function(e) {
    const value = e.detail.value;
    this.setData({ autoFlip: value });
    
    if (value) {
      this.flipManager.startAutoFlip(this);
      wx.showToast({
        title: '自动翻页已开启',
        icon: 'none'
      });
    } else {
      this.flipManager.stopAutoFlip(this);
      wx.showToast({
        title: '自动翻页已关闭',
        icon: 'none'
      });
    }
    
    this.saveSettings();
  },

  /**
   * 切换音效功能
   * 开启或关闭翻页音效
   * @param {Object} e - 开关事件对象，包含开关状态
   */
  toggleSound: function(e) {
    const value = e.detail.value;
    this.setData({ soundOn: value });
    
    wx.showToast({
      title: value ? '音效已开启' : '音效已关闭',
      icon: 'none'
    });
    
    this.saveSettings();
  },

  /**
   * 模拟书本翻页效果
   * 展示翻页动画效果
   */
  simulateBookFlip: function() {
    wx.showToast({
      title: '模拟书本翻页中...',
      icon: 'loading',
      duration: 2000
    });
    
    setTimeout(() => {
      wx.showToast({
        title: '模拟翻页效果完成',
        icon: 'success'
      });
    }, 2000);
    
    this.setData({ showCircleMenu: false });
  },

  /**
   * 显示同学画功能
   * 查看其他同学的阅读笔记和标注
   */
  showPeerDrawing: function() {
    wx.showModal({
      title: '同学画功能',
      content: '查看其他同学的阅读笔记和标注，共同学习进步。',
      showCancel: true,
      confirmText: '查看',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '加载同学笔记中...',
            icon: 'loading',
            duration: 1500
          });
        }
      }
    });
    this.setData({ showCircleMenu: false });
  },

  /**
   * 显示书籍目录
   * 展示书籍的章节目录
   */
  showCatalog: function() {
    // 生成目录
    let catalogContent = '书籍目录:\n\n';
    for (let i = 1; i <= 10; i++) {
      catalogContent += `${i}. 第${i}章 内容简介\n`;
    }
    
    wx.showModal({
      title: '书籍目录',
      content: catalogContent,
      showCancel: true,
      confirmText: '跳转',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '目录跳转功能',
            icon: 'none'
          });
        }
      }
    });
    this.setData({ showCircleMenu: false });
  },

  /**
   * 显示书籍作者信息
   * 展示书籍的作者和出版信息
   */
  showAuthor: function() {
    wx.showModal({
      title: '书籍作者',
      content: '《人工智能"+"特辑》编辑团队\n出版时间：2024年3月\n出版社：科技出版社',
      showCancel: false,
      confirmText: '知道了'
    });
    this.setData({ showCircleMenu: false });
  },

  /**
   * 显示使用帮助
   * 展示阅读器的使用方法和功能说明
   */
  showHelp: function() {
    wx.showModal({
      title: '使用帮助',
      content: '1. 左右滑动翻页\n2. 点击箭头快速翻页\n3. 使用缩略图跳转\n4. 上传文件管理\n5. 多种阅读设置',
      showCancel: false,
      confirmText: '确定'
    });
    this.setData({ showCircleMenu: false });
  },

  /**
   * 显示版本信息
   * 展示阅读器的版本号和功能介绍
   */
  showVersion: function() {
    wx.showModal({
      title: '版本信息',
      content: 'AI电子书阅读器 v2.0.1\n\n功能：\n• 支持多种文件格式\n• 智能缩放\n• 自动翻页\n• 文件管理\n• 社交分享',
      showCancel: false,
      confirmText: '确定'
    });
    this.setData({ showCircleMenu: false });
  },




});