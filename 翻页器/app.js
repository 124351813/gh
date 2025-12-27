/**
 * 小程序入口文件
 * 管理小程序的全局生命周期和全局数据
 */
App({
  /**
   * 小程序启动时执行
   * 可以在这里初始化全局数据、加载用户信息、配置环境等
   */
  onLaunch: function () {
    console.log('小程序启动');
    
    // ====== 新增：云开发初始化（只加这一段，其他都保留）======
    // 检查是否支持云开发
    if (!wx.cloud) {
      wx.showToast({
        title: '请升级微信基础库到2.2.3以上',
        icon: 'none'
      });
    } else {
      // 初始化云开发（核心：替换成你的云环境ID）
      wx.cloud.init({
        env: 'cloud1-1giyzmhyf65404a7', // ！！！必须替换成你自己的云环境ID！！！
        traceUser: true, // 记录用户操作日志，方便排查问题
      });
    }
    // ====== 云开发初始化结束 ======
  },
  
  /**
   * 小程序显示时执行
   * 当小程序从后台切换到前台时触发
   */
  onShow: function () {
    console.log('小程序显示');
  },
  
  /**
   * 小程序隐藏时执行
   * 当小程序从前台切换到后台时触发
   */
  onHide: function () {
    console.log('小程序隐藏');
  },
  
  /**
   * 全局数据对象
   * 用于在不同页面之间共享数据
   */
  globalData: {
    userInfo: null,      // 用户信息，用于登录和个性化设置
    bookSettings: null   // 全局书籍设置，如默认字体、主题等
  }
});