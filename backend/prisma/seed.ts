/**
 * Database Seeder for UniStay Platform
 *
 * Generates fake data for development and testing
 * Run with: npm run prisma:seed
 */

import {
  PrismaClient,
  UserRole,
  Gender,
  BoardingType,
  ReactionType,
} from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

// Configuration
const SEED_CONFIG = {
  students: 20,
  owners: 5,
  boardings: 15,
  reviewsPerBoarding: 3,
  commentsPerReview: 2,
  reactionsPerReview: 5,
  reactionsPerComment: 3,
};

// Helper functions
function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
}

function randomEnum<T extends object>(enumObj: T): T[keyof T] {
  const values = Object.values(enumObj) as T[keyof T][];
  return values[Math.floor(Math.random() * values.length)];
}

async function createStudents(count: number) {
  console.log(`Creating ${count} students...`);

  const students = [];
  const universities = [
    "Sri Lanka Institute of Information Technology",
    "University of Colombo",
    "University of Peradeniya",
    "University of Moratuwa",
    "University of Kelaniya",
    "University of Sri Jayewardenepura",
    "Open University of Sri Lanka",
    "General Sir John Kotelawala Defence University",
    "South Eastern University of Sri Lanka",
  ];

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const student = await prisma.user.create({
      data: {
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        firstName,
        lastName,
        phone: faker.phone.number("+947########"),
        nicNumber: faker.string.numeric(10),
        gender: randomEnum(Gender),
        dateOfBirth: faker.date.between({
          from: "2000-01-01",
          to: "2006-12-31",
        }),
        role: UserRole.STUDENT,
        university: faker.helpers.arrayElement(universities),
        studyYear: faker.number.int({ min: 1, max: 4 }),
        degree: faker.helpers.arrayElement([
          "Computer Science",
          "Information Technology",
          "Engineering",
          "Business Administration",
          "Medicine",
          "Law",
          "Economics",
          "Mathematics",
        ]),
      },
    });
    students.push(student);
    console.log(`  Created student: ${firstName} ${lastName}`);
  }

  return students;
}

async function createOwners(count: number) {
  console.log(`Creating ${count} owners...`);

  const owners = [];

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const owner = await prisma.user.create({
      data: {
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        firstName,
        lastName,
        phone: faker.phone.number("+947########"),
        nicNumber: faker.string.numeric(10),
        gender: randomEnum(Gender),
        dateOfBirth: faker.date.between({
          from: "1970-01-01",
          to: "1995-12-31",
        }),
        role: UserRole.OWNER,
      },
    });
    owners.push(owner);
    console.log(`  Created owner: ${firstName} ${lastName}`);
  }

  return owners;
}

async function createBoardings(count: number, owners: any[]) {
  console.log(`Creating ${count} boardings...`);

  const boardingTypes = Object.values(BoardingType);
  const cities = [
    "Colombo",
    "Kandy",
    "Galle",
    "Kurunegala",
    "Anuradhapura",
    "Matara",
    "Jaffna",
    "Negombo",
  ];
  const amenitiesList = [
    "WiFi",
    "Air Conditioning",
    "Hot Water",
    "Laundry",
    "Parking",
    "Security",
    "Kitchen",
    "Gym",
    "Swimming Pool",
    "Study Room",
    "Common Area",
    "Balcony",
    "Generator",
    "Water Tank",
  ];

  const boardings = [];

  for (let i = 0; i < count; i++) {
    const owner = faker.helpers.arrayElement(owners);
    const propertyName =
      faker.helpers.arrayElement([
        "Sunrise",
        "Moonlight",
        "Green",
        "Golden",
        "Silver",
        "Royal",
        "Grand",
        "Comfort",
        "Peaceful",
        "Modern",
      ]) +
      " " +
      faker.helpers.arrayElement([
        "Residency",
        "Lodge",
        "Inn",
        "Place",
        "House",
        "Villa",
        "Apartments",
        "Stay",
      ]);

    const boarding = await prisma.boarding.create({
      data: {
        propertyName,
        type: faker.helpers.arrayElement(boardingTypes),
        address: faker.location.streetAddress(),
        city: faker.helpers.arrayElement(cities),
        state: faker.helpers.arrayElement([
          "Western",
          "Central",
          "Southern",
          "Northern",
          "Eastern",
          "North Western",
          "North Central",
          "Uva",
          "Sabaragamuwa",
        ]),
        zipCode: faker.location.zipCode(),
        description: faker.lorem.paragraph({ min: 2, max: 4 }),
        amenities: faker.helpers.arrayElements(amenitiesList, {
          min: 3,
          max: 8,
        }),
        price: faker.number.float({ min: 15000, max: 80000, multipleOf: 5000 }),
        available: faker.datatype.boolean({ probability: 0.8 }),
        ownerId: owner.id,
      },
    });
    boardings.push(boarding);
    console.log(`  Created boarding: ${propertyName}`);
  }

  return boardings;
}

async function createReviews(students: any[], boardings: any[]) {
  console.log("Creating reviews...");

  const reviews = [];
  const reviewComments = [
    "Great place to stay!",
    "Very convenient location",
    "Good value for money",
    "Could be better",
    "Excellent facilities",
    "Clean and comfortable",
    "Friendly staff",
    "Highly recommended",
  ];

  for (const boarding of boardings) {
    const numReviews = faker.number.int({
      min: 1,
      max: SEED_CONFIG.reviewsPerBoarding,
    });

    // Select random students for reviews (ensure unique reviewers per boarding)
    const selectedStudents = faker.helpers.arrayElements(
      students,
      Math.min(numReviews, students.length),
    );

    for (const student of selectedStudents) {
      const commentedAt = randomDate(new Date("2024-01-01"), new Date());

      const hasComment = faker.datatype.boolean({ probability: 0.8 });
      const hasImages = faker.datatype.boolean({ probability: 0.4 });
      const hasVideo = faker.datatype.boolean({ probability: 0.15 });

      const review = await prisma.review.create({
        data: {
          boardingId: boarding.id,
          studentId: student.id,
          rating: faker.number.int({ min: 1, max: 5 }),
          comment: hasComment
            ? faker.helpers.arrayElement(reviewComments) +
              " " +
              faker.lorem.sentence()
            : null,
          commentedAt,
          editedAt: faker.datatype.boolean({ probability: 0.2 })
            ? new Date(commentedAt.getTime() + 86400000) // 1 day later
            : null,
          likeCount: faker.number.int({ min: 0, max: 20 }),
          dislikeCount: faker.number.int({ min: 0, max: 5 }),
          images: hasImages
            ? Array.from(
                { length: faker.number.int({ min: 1, max: 5 }) },
                () =>
                  `https://picsum.photos/800/600?random=${faker.string.uuid()}`,
              )
            : [],
          video: hasVideo
            ? `https://example.com/video/${faker.string.uuid()}.mp4`
            : null,
        },
      });
      reviews.push(review);
    }
  }

  console.log(`  Created ${reviews.length} reviews`);
  return reviews;
}

async function createReviewComments(students: any[], reviews: any[]) {
  console.log("Creating review comments...");

  const comments = [];
  const commentTexts = [
    "Thank you for your feedback!",
    "We appreciate your review.",
    "We will work on improving this.",
    "Glad you enjoyed your stay!",
    "Sorry to hear about your experience.",
    "We value your input.",
    "Thank you for choosing us!",
    "We hope to see you again!",
  ];

  for (const review of reviews) {
    const numComments = faker.number.int({
      min: 0,
      max: SEED_CONFIG.commentsPerReview,
    });

    for (let i = 0; i < numComments; i++) {
      const commentor = faker.helpers.arrayElement(students);
      const commentedAt = new Date(
        review.commentedAt.getTime() +
          faker.number.int({ min: 1, max: 7 }) * 86400000,
      );

      const comment = await prisma.reviewComment.create({
        data: {
          reviewId: review.id,
          commentorId: commentor.id,
          comment:
            faker.helpers.arrayElement(commentTexts) +
            " " +
            faker.lorem.sentence(),
          commentedAt,
          editedAt: faker.datatype.boolean({ probability: 0.15 })
            ? new Date(commentedAt.getTime() + 43200000) // 12 hours later
            : null,
          likeCount: faker.number.int({ min: 0, max: 10 }),
          dislikeCount: faker.number.int({ min: 0, max: 3 }),
        },
      });
      comments.push(comment);
    }
  }

  console.log(`  Created ${comments.length} review comments`);
  return comments;
}

async function createReactions(
  students: any[],
  reviews: any[],
  reviewComments: any[],
) {
  console.log("Creating reactions...");

  let reviewReactionsCount = 0;
  let commentReactionsCount = 0;

  // Review reactions
  for (const review of reviews) {
    const numReactions = faker.number.int({
      min: 0,
      max: SEED_CONFIG.reactionsPerReview,
    });
    const selectedStudents = faker.helpers.arrayElements(
      students,
      Math.min(numReactions, students.length),
    );

    for (const student of selectedStudents) {
      try {
        await prisma.reviewReaction.create({
          data: {
            reviewId: review.id,
            userId: student.id,
            type: faker.datatype.boolean({ probability: 0.85 })
              ? ReactionType.LIKE
              : ReactionType.DISLIKE,
          },
        });
        reviewReactionsCount++;
      } catch {
        // Ignore duplicate reactions (unique constraint)
      }
    }
  }

  // Review comment reactions
  for (const comment of reviewComments) {
    const numReactions = faker.number.int({
      min: 0,
      max: SEED_CONFIG.reactionsPerComment,
    });
    const selectedStudents = faker.helpers.arrayElements(
      students,
      Math.min(numReactions, students.length),
    );

    for (const student of selectedStudents) {
      try {
        await prisma.reviewCommentReaction.create({
          data: {
            reviewCommentId: comment.id,
            userId: student.id,
            type: faker.datatype.boolean({ probability: 0.9 })
              ? ReactionType.LIKE
              : ReactionType.DISLIKE,
          },
        });
        commentReactionsCount++;
      } catch {
        // Ignore duplicate reactions (unique constraint)
      }
    }
  }

  console.log(
    `  Created ${reviewReactionsCount} review reactions and ${commentReactionsCount} comment reactions`,
  );
}

async function main() {
  console.log("🌱 Starting database seeding...\n");

  // Wait for tables to be ready and check if data already exists
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      const existingReviews = await prisma.review.count();
      if (existingReviews > 0) {
        console.log("✅ Database already seeded. Skipping...");
        console.log(`   Found ${existingReviews} existing reviews.\n`);
        return;
      }
      break; // Tables exist and no data, proceed with seeding
    } catch (error: any) {
      attempts++;
      if (attempts >= maxAttempts) {
        console.error("❌ Database tables not ready after multiple attempts");
        throw error;
      }
      console.log(
        `⏳ Waiting for tables... (attempt ${attempts}/${maxAttempts})`,
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Create users
  const students = await createStudents(SEED_CONFIG.students);
  const owners = await createOwners(SEED_CONFIG.owners);

  // Create boardings
  const boardings = await createBoardings(SEED_CONFIG.boardings, owners);

  // Create reviews
  const reviews = await createReviews(students, boardings);

  // Create review comments
  const reviewComments = await createReviewComments(students, reviews);

  // Create reactions
  await createReactions(students, reviews, reviewComments);

  console.log("\n✅ Database seeding completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`   - Students: ${students.length}`);
  console.log(`   - Owners: ${owners.length}`);
  console.log(`   - Boardings: ${boardings.length}`);
  console.log(`   - Reviews: ${reviews.length}`);
  console.log(`   - Review Comments: ${reviewComments.length}`);
}

// Error handling
main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
