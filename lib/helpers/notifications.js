import Notification from '../../models/Notification';

/**
 * Create a notification for a user
 * @param {string} userId - User ID
 * @param {string} type - Notification type (points, login, checkin)
 * @param {string} message - Notification message
 * @param {object} data - Additional data
 */
export async function createNotification(userId, type, message, data = {}) {
  try {
    const notification = await Notification.create({
      userId,
      type,
      message,
      data
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

/**
 * Create first 100 points notification
 * @param {string} userId - User ID
 */
export async function createFirst100PointsNotification(userId) {
  const message = '⭐ Chúc mừng! Bạn đã đạt được 100 điểm đầu tiên! Tiếp tục phát huy!';
  return await createNotification(userId, 'points', message, { milestone: 100 });
}

/**
 * Create welcome back notification
 * @param {string} userId - User ID
 * @param {string} userName - User name
 */
export async function createWelcomeBackNotification(userId, userName) {
  const message = `👋 Chào mừng ${userName} quay lại! Hãy cùng học tiếp nhé!`;
  return await createNotification(userId, 'login', message, {});
}

/**
 * Create check-in success notification
 * @param {string} userId - User ID
 * @param {number} points - Points earned from check-in
 */
export async function createCheckInNotification(userId, points = 10) {
  const message = `✅ Điểm danh thành công! Bạn đã nhận được ${points} điểm!`;
  return await createNotification(userId, 'checkin', message, { points });
}

/**
 * Create points milestone notification
 * @param {string} userId - User ID
 * @param {number} totalPoints - Total points
 */
export async function createPointsMilestoneNotification(userId, totalPoints) {
  const milestones = [100, 500, 1000, 2500, 5000, 10000];

  if (milestones.includes(totalPoints)) {
    let message = '';

    if (totalPoints === 100) {
      message = '⭐ Chúc mừng! Bạn đã đạt 100 điểm đầu tiên!';
    } else if (totalPoints === 500) {
      message = '🌟 Tuyệt vời! Bạn đã có 500 điểm!';
    } else if (totalPoints === 1000) {
      message = '🎯 Xuất sắc! 1,000 điểm rồi!';
    } else if (totalPoints === 2500) {
      message = '💪 Không thể tin được! 2,500 điểm!';
    } else if (totalPoints === 5000) {
      message = '🏆 Phi thường! 5,000 điểm!';
    } else if (totalPoints === 10000) {
      message = '👑 Bạn là huyền thoại! 10,000 điểm!';
    } else {
      message = `⭐ Tuyệt vời! Bạn đã đạt ${totalPoints.toLocaleString()} điểm!`;
    }

    return await createNotification(userId, 'points', message, { totalPoints });
  }

  return null;
}
