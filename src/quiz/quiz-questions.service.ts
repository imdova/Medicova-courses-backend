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
    let quizQuestion = this.quizQuestionRepository.create({
      quiz,
      question,
      order: dto.order,
    });

    // Reorder logic
    quizQuestion = await this.reorderQuestions(quizId, quizQuestion);

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

  async createQuestionsBulk(
    quizId: string,
    dtos: CreateQuestionDto[],
  ): Promise<QuizQuestion[]> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId, deleted_at: null },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    // Create all questions at once
    const questions = this.questionRepository.create(dtos);
    await this.questionRepository.save(questions);

    // Map to quizQuestions
    const quizQuestions = questions.map((question, i) =>
      this.quizQuestionRepository.create({
        quiz,
        question,
        order: dtos[i].order ?? i + 1,
      }),
    );

    // Save all quizQuestions at once
    return this.quizQuestionRepository.save(quizQuestions);
  }

  async updateQuestionInQuiz(
    quizId: string,
    quizQuestionId: string,
    dto: UpdateQuestionDto,
  ): Promise<QuizQuestion> {
    let quizQuestion = await this.quizQuestionRepository.findOne({
      where: { id: quizQuestionId, quiz: { id: quizId }, deleted_at: null },
      relations: ['question'],
    });

    if (!quizQuestion) {
      throw new NotFoundException('Quiz question not found');
    }

    // Update linked question fields
    Object.assign(quizQuestion.question, dto);

    // Save updated question
    await this.questionRepository.save(quizQuestion.question);

    // If order provided → reorder
    if (dto.order !== undefined) {
      quizQuestion.order = dto.order;
      quizQuestion = await this.reorderQuestions(quizId, quizQuestion);
    }

    // Save changes
    return this.quizQuestionRepository.save(quizQuestion);
  }

  async removeQuestionFromQuiz(
    quizId: string,
    quizQuestionId: string,
  ): Promise<void> {
    const quizQuestion = await this.quizQuestionRepository.findOne({
      where: { id: quizQuestionId, quiz: { id: quizId } },
      relations: ['question'],
    });

    if (!quizQuestion) throw new NotFoundException('Quiz question not found');

    // First remove the question itself
    await this.questionRepository.remove(quizQuestion.question);

    // Then remove the quiz-question link
    await this.quizQuestionRepository.remove(quizQuestion);
  }

  private async reorderQuestions(
    quizId: string,
    item: QuizQuestion,
  ): Promise<QuizQuestion> {
    // Fetch all questions for the quiz, ordered
    const items = await this.quizQuestionRepository.find({
      where: { quiz: { id: quizId }, deleted_at: null },
      order: { order: 'ASC' },
    });

    // If no order provided, set to last
    if (item.order === undefined || item.order === null) {
      item.order = (items[items.length - 1]?.order ?? 0) + 1;
      return item;
    }

    // Remove current item if already exists (for update)
    const filtered = items.filter((i) => i.id !== item.id);

    // Insert the item at the desired index (order - 1)
    filtered.splice(item.order - 1, 0, item);

    // Reassign sequential orders starting from 1
    const reordered = filtered.map((i, index) => {
      i.order = index + 1;
      return i;
    });

    // Save all items except the one being created/updated
    await this.quizQuestionRepository.save(
      reordered.filter((i) => i.id !== item.id),
    );

    // Return the updated item
    return reordered.find((i) => i.id === item.id) ?? item;
  }
}
