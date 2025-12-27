/**
 * 工具函数模块
 * 提供常用的格式化和辅助函数
 */

/**
 * 格式化日期时间
 * 将Date对象格式化为"年/月/日 时:分:秒"的字符串格式
 * @param {Date} date - 要格式化的日期对象
 * @returns {string} - 格式化后的日期时间字符串
 */
const formatTime = date => {
  const year = date.getFullYear()   // 获取年份
  const month = date.getMonth() + 1  // 获取月份（0-11，所以加1）
  const day = date.getDate()         // 获取日期
  const hour = date.getHours()       // 获取小时
  const minute = date.getMinutes()   // 获取分钟
  const second = date.getSeconds()   // 获取秒数

  // 格式化年月日和时分秒，不足两位的数字前面补零
  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

/**
 * 格式化数字为两位数
 * 如果数字小于10，则在前面补零
 * @param {number} n - 要格式化的数字
 * @returns {string} - 格式化后的两位数字符串
 */
const formatNumber = n => {
  n = n.toString()  // 转换为字符串
  return n[1] ? n : `0${n}`  // 如果有第二位数字则直接返回，否则补零
}

// 导出工具函数
module.exports = {
  formatTime
}
