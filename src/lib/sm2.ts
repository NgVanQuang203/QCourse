export interface SM2Data {
  easiness: number; // Hệ số E, bắt đầu ở 2.5
  interval: number; // Khoảng thời gian lặp (ngày)
  repetitions: number; // Số lần trả lời đúng liên tiếp
  nextReviewDate: number; // Timestamp (ms) - Thời gian chính xác đến từng mili-giây
}

export const sm2InitialData = (): SM2Data => ({
  easiness: 2.5,
  interval: 0,
  repetitions: 0,
  nextReviewDate: Date.now(), // Mặc định khi tạo card là phải học ngay
});

/**
 * Thuật Toán SuperMemo-2 (Spaced Repetition)
 * Độ chính xác cao, tính toán theo MS.
 * 
 * Quality (0-5 mức độ nhớ):
 * 5: Hoàn hảo - nhớ ngay lập tức
 * 4: Tốt - nhớ được sau 1 lúc do dự
 * 3: Khó - rất khó khăn mới nhớ ra
 * 2: Sai - nhưng khi nhìn đáp án thấy quen
 * 1: Sai - nhớ sai hoàn toàn
 * 0: Hoàn toàn không biết gì (Blackout)
 */
export const calculateSM2 = (quality: number, data: SM2Data): SM2Data => {
  let { easiness, interval, repetitions } = data;

  // Nếu người dùng nhớ bài (Quality >= 3)
  if (quality >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easiness);
    }
    repetitions++;
  } else {
    // Nếu người dùng quên (Quality < 3) - làm lại từ đầu
    repetitions = 0;
    interval = 1;
  }

  // Cập nhật hệ số Easiness (E-Factor)
  easiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  // Ràng buộc hệ số E-Factor tối thiểu là 1.3 (Thuật toán chuẩn tránh việc vòng lặp quá lâu)
  if (easiness < 1.3) {
    easiness = 1.3;
  }

  // Cập nhật thời gian học lại với giờ phút hiển thị real time
  const now = Date.now();
  // Tính theo đúng ms (Số ngày * 24h * 60p * 60s * 1000m)
  const nextReviewDate = now + interval * 24 * 60 * 60 * 1000;

  return {
    easiness,
    interval,
    repetitions,
    nextReviewDate,
  };
};
