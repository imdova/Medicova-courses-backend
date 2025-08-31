import { Quiz } from '../entities/quiz.entity';

export type QuizWithStats = Quiz & {
  questionCount: number;
  average_score: number;
  success_rate: number;
};
