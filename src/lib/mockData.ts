import { SM2Data, sm2InitialData } from './types/sm2';

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  options?: string[]; // Dành cho câu hỏi trắc nghiệm
  correctOptionIndex?: number;
  sm2Data: SM2Data;
}

export interface Deck {
  id: string;
  folderId?: string | null;
  name: string;
  description: string;
  color: string;
  timeLimitSec?: number;
  type?: 'FLASHCARD' | 'QUIZ';
  updatedAt?: string;
}

export interface Folder {
  id: string;
  name: string;
  icon: string; // Tên icon Lucide
  updatedAt?: string;
}

export const mockFolders: Folder[] = [
  { id: 'f1', name: 'Ngoại ngữ', icon: 'languages' },
  { id: 'f2', name: 'Khoa học', icon: 'atom' },
  { id: 'f3', name: 'Lập trình', icon: 'code' },
];

export const mockDecks: Deck[] = [
  { 
    id: 'd1', folderId: 'f1', 
    name: 'Tiếng Anh: 500 Từ Giao Tiếp', 
    description: 'Các từ vựng cơ bản thông dụng nhất hàng ngày.', 
    color: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' 
  },
  { 
    id: 'd2', folderId: 'f1', 
    name: 'IELTS Vocabulary (Band 7+)', 
    description: 'Từ vựng học thuật cao cấp.', 
    color: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)' 
  },
  { 
    id: 'd3', folderId: 'f3', 
    name: 'ReactJS Fundamentals', 
    description: 'Các khái niệm cơ bản về React và Hooks.', 
    color: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)' 
  },
  { 
    id: 'd4', folderId: 'f2', 
    name: 'Vật lý lượng tử', 
    description: 'Cơ sở của thế giới vi mô.', 
    color: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' 
  }
];

// Thời gian giả lập để có thẻ báo đến hạn
const now = Date.now();
const past = now - 24 * 60 * 60 * 1000; // Đã quá hạn 1 ngày
const future = now + 24 * 60 * 60 * 1000; // Chưa đến hạn

export const mockCards: Card[] = [
  // Deck 1
  {
    id: 'c1', deckId: 'd1', front: 'Diligence', back: 'Sự siêng năng, cần cù', 
    sm2Data: { easiness: 2.5, interval: 1, repetitions: 1, nextReviewDate: past }
  },
  {
    id: 'c2', deckId: 'd1', front: 'Eloquent', back: 'Có tài hùng biện', 
    sm2Data: sm2InitialData() // Cần học ngay (new)
  },
  {
    id: 'c3', deckId: 'd1', front: 'Resilient', back: 'Kiên cường, mau phục hồi', 
    sm2Data: { easiness: 2.6, interval: 6, repetitions: 2, nextReviewDate: future }
  },
  
  // Deck 3 (Mix Quizzes and Flashcards)
  {
    id: 'c4', deckId: 'd3', 
    front: 'Hook nào dưới đây dùng để thay đổi state theo các action phức tạp?', 
    back: 'useReducer', 
    options: ['useState', 'useContext', 'useReducer', 'useEffect'], 
    correctOptionIndex: 2,
    sm2Data: sm2InitialData()
  },
  {
    id: 'c5', deckId: 'd3', 
    front: 'Virtual DOM là gì?', 
    back: 'Là một bản sao nhẹ của DOM thực tế, cho phép cập nhật hiệu quả giao diện.', 
    sm2Data: sm2InitialData()
  }
];
