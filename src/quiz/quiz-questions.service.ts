import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz } from './entities/quiz.entity';
import { Question } from './entities/question.entity';
import { QuizQuestion } from './entities/quiz-question.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuizQuestionsService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,

    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,

    @InjectRepository(QuizQuestion)
    private readonly quizQuestionRepository: Repository<QuizQuestion>,
  ) {}

  async createQuestionAndAddToQuiz(
    quizId: string,
    dto: CreateQuestionDto,
  ): Promise<QuizQuestion> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId, deleted_at: null },
    });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Create question
    const question = this.questionRepository.create(dto);
    await this.questionRepository.save(question);

    // Link question to quiz
    const quizQuestion = this.quizQuestionRepository.create({
      quiz,
      question,
      order: dto.order ?? 1, // default order if not provided
    });

    return this.quizQuestionRepository.save(quizQuestion);
  }

  async listQuestionsForQuiz(quizId: string): Promise<QuizQuestion[]> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId, deleted_at: null },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    return this.quizQuestionRepository.find({
      where: { quiz: { id: quizId }, deleted_at: null },
      relations: ['question'],
      order: { order: 'ASC' },
    });
  }

  async updateQuestionInQuiz(
    quizId: string,
    quizQuestionId: string,
    dto: UpdateQuestionDto,
  ): Promise<QuizQuestion> {
    const quizQuestion = await this.quizQuestionRepository.findOne({
      where: { id: quizQuestionId, quiz: { id: quizId }, deleted_at: null },
      relations: ['question'],
    });

    if (!quizQuestion) {
      throw new NotFoundException('Quiz question not found');
    }

    // Update linked question fields
    Object.assign(quizQuestion.question, dto);

    // Update order if provided
    if (dto.order !== undefined) {
      quizQuestion.order = dto.order;
    }

    // Save changes
    await this.questionRepository.save(quizQuestion.question);
    return this.quizQuestionRepository.save(quizQuestion);
  }

  async removeQuestionFromQuiz(
    quizId: string,
    quizQuestionId: string,
  ): Promise<void> {
    const quizQuestion = await this.quizQuestionRepository.findOne({
      where: { id: quizQuestionId, quiz: { id: quizId }, deleted_at: null },
    });
    if (!quizQuestion) throw new NotFoundException('Quiz question not found');

    quizQuestion.deleted_at = new Date();
    await this.quizQuestionRepository.save(quizQuestion);
  }
}
