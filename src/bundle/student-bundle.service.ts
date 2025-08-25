import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Bundle } from '../bundle/entities/bundle.entity';
import { CurrencyCode } from '../bundle/entities/bundle-pricing.entity';
import { CourseStudent } from '../course/entities/course-student.entity';
import { Profile } from 'src/profile/entities/profile.entity';

@Injectable()
export class StudentBundleService {
  constructor(
    @InjectRepository(Bundle)
    private readonly bundleRepo: Repository<Bundle>,
    @InjectRepository(CourseStudent)
    private readonly courseStudentRepo: Repository<CourseStudent>,
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
  ) {}

  /** Map user nationality → currency code */
  private async getCurrencyForUser(userId: string): Promise<CurrencyCode> {
    const profile = await this.profileRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!profile || !profile.nationality) return CurrencyCode.USD;

    switch (profile.nationality.toLowerCase()) {
      case 'egyptian':
        return CurrencyCode.EGP;
      case 'saudi':
        return CurrencyCode.SAR;
      case 'eurozone':
        return CurrencyCode.EUR;
      default:
        return CurrencyCode.USD;
    }
  }

  /** Get all bundles with pricing filtered by student's currency */
  async getAvailableBundles(user: any) {
    const currency = await this.getCurrencyForUser(user.sub);

    const bundles = await this.bundleRepo.find({
      where: { active: true },
      relations: ['pricings', 'courseBundles', 'courseBundles.course'],
    });

    return bundles.map((bundle) => {
      // Pick pricing that matches student currency
      let pricing = bundle.pricings.find((p) => p.currency_code === currency);
      if (!pricing) {
        pricing = bundle.pricings.find(
          (p) => p.currency_code === CurrencyCode.USD,
        );
      }

      return {
        ...bundle,
        pricings: pricing ? [pricing] : [],
      };
    });
  }

  /** Enroll student in all courses in the bundle */
  async enrollStudentInBundle(bundleId: string, user: any) {
    // 1️⃣ Fetch the bundle and its courses
    const bundle = await this.bundleRepo.findOne({
      where: { id: bundleId, active: true },
      relations: ['courseBundles', 'courseBundles.course'],
    });
    if (!bundle) throw new NotFoundException('Bundle not found');

    const courseIds = bundle.courseBundles.map((cb) => cb.course.id);

    if (!courseIds.length) {
      return { message: 'No courses in this bundle', enrolledCourses: [] };
    }

    // 2️⃣ Fetch existing enrollments in a single query
    const existingEnrollments = await this.courseStudentRepo.find({
      where: {
        student: { id: user.sub },
        course: { id: In(courseIds) },
      },
      relations: ['course'],
    });

    const existingCourseIds = new Set(
      existingEnrollments.map((e) => e.course.id),
    );

    // 3️⃣ Create enrollments only for courses not yet enrolled
    const newEnrollments = bundle.courseBundles
      .filter((cb) => !existingCourseIds.has(cb.course.id))
      .map((cb) =>
        this.courseStudentRepo.create({
          course: cb.course,
          student: { id: user.sub } as any,
        }),
      );

    if (newEnrollments.length) {
      await this.courseStudentRepo.save(newEnrollments);
    }

    return {
      message: 'Student enrolled successfully',
      enrolledCourses: newEnrollments.map((e) => e.course.id),
    };
  }
}
