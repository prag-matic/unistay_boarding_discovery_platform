import bcrypt from "bcryptjs";
import { config } from "@/config/env.js";
import { connectDB, disconnectDB } from "@/lib/mongodb.js";
import {
	AdminAction,
	Boarding,
	BoardingAmenity,
	BoardingImage,
	BoardingRule,
	EmailVerificationToken,
	Issue,
	MarketplaceItem,
	MarketplaceReport,
	PasswordResetToken,
	Payment,
	RefreshToken,
	RentalPeriod,
	Reservation,
	Review,
	ReviewComment,
	ReviewCommentReaction,
	ReviewReaction,
	SavedBoarding,
	User,
	VisitRequest,
} from "@/models/index.js";
import {
	BoardingAmenityType,
	BoardingStatus,
	BoardingType,
	GenderPref,
	MarketplaceAdType,
	MarketplaceCondition,
	MarketplaceStatus,
	PaymentMethod,
	PaymentStatus,
	ReactionType,
	RentalPeriodStatus,
	ReservationStatus,
	Role,
	VisitRequestStatus,
} from "@/types/enums.js";

const demoPassword = process.env.SEED_PASSWORD ?? "Demo@12345";
const passwordHash = await bcrypt.hash(demoPassword, config.saltRounds);

const now = new Date();
const daysFromNow = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

type DemoUser = {
	email: string;
	firstName: string;
	lastName: string;
	role: Role;
	phone?: string;
	university?: string;
	nicNumber?: string;
	profileImageUrl?: string;
};

const demoUsers: DemoUser[] = [
	{
		email: "admin@unistay.local",
		firstName: "Ayesha",
		lastName: "Fernando",
		role: Role.ADMIN,
		phone: "+94 71 000 0001",
		profileImageUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Ayesha%20Fernando",
	},
	{
		email: "owner.amal@unistay.local",
		firstName: "Amal",
		lastName: "Perera",
		role: Role.OWNER,
		phone: "+94 71 000 0002",
		profileImageUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Amal%20Perera",
	},
	{
		email: "owner.nisansala@unistay.local",
		firstName: "Nisansala",
		lastName: "Wijesinghe",
		role: Role.OWNER,
		phone: "+94 71 000 0003",
		profileImageUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Nisansala%20Wijesinghe",
	},
	{
		email: "student.kavindu@unistay.local",
		firstName: "Kavindu",
		lastName: "Silva",
		role: Role.STUDENT,
		phone: "+94 77 000 0004",
		university: "University of Colombo",
		nicNumber: "200112345678",
		profileImageUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Kavindu%20Silva",
	},
	{
		email: "student.tharushi@unistay.local",
		firstName: "Tharushi",
		lastName: "Jayasinghe",
		role: Role.STUDENT,
		phone: "+94 77 000 0005",
		university: "University of Moratuwa",
		nicNumber: "200212345678",
		profileImageUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Tharushi%20Jayasinghe",
	},
];

const boardingFixtures = [
	{
		title: "Harbour View Annex",
		slug: "harbour-view-annex",
		description:
			"Modern annex near Colombo city with fast Wi-Fi, study areas, and private parking.",
		city: "Colombo",
		district: "Colombo",
		address: "42 Harbour Road, Colombo 03",
		monthlyRent: 42000,
		boardingType: BoardingType.ANNEX,
		genderPref: GenderPref.ANY,
		nearUniversity: "University of Colombo",
		latitude: 6.9271,
		longitude: 79.8612,
		maxOccupants: 6,
		currentOccupants: 4,
		status: BoardingStatus.ACTIVE,
		ownerEmail: "owner.amal@unistay.local",
		amenities: [
			BoardingAmenityType.WIFI,
			BoardingAmenityType.AIR_CONDITIONING,
			BoardingAmenityType.PARKING,
			BoardingAmenityType.GENERATOR,
		],
		rules: ["No smoking inside rooms", "Quiet hours after 10:00 PM", "Guests allowed until 9:00 PM"],
		imageSeeds: ["harbour-view-annex-1", "harbour-view-annex-2"],
	},
	{
		title: "Campus Breeze Rooms",
		slug: "campus-breeze-rooms",
		description:
			"Affordable student rooms with shared kitchen, common lounge, and study room.",
		city: "Kandy",
		district: "Kandy",
		address: "18 Peradeniya Road, Kandy",
		monthlyRent: 28500,
		boardingType: BoardingType.SHARED_ROOM,
		genderPref: GenderPref.FEMALE,
		nearUniversity: "University of Peradeniya",
		latitude: 7.2906,
		longitude: 80.6337,
		maxOccupants: 8,
		currentOccupants: 6,
		status: BoardingStatus.ACTIVE,
		ownerEmail: "owner.nisansala@unistay.local",
		amenities: [
			BoardingAmenityType.WIFI,
			BoardingAmenityType.KITCHEN,
			BoardingAmenityType.STUDY_ROOM,
			BoardingAmenityType.COMMON_AREA,
		],
		rules: ["No pets", "Keep shared areas clean", "Laundry slot booking required"],
		imageSeeds: ["campus-breeze-rooms-1", "campus-breeze-rooms-2"],
	},
	{
		title: "Sunset House",
		slug: "sunset-house",
		description:
			"Spacious boarding house with a large kitchen, balcony views, and water tank backup.",
		city: "Galle",
		district: "Galle",
		address: "77 Lighthouse Street, Galle",
		monthlyRent: 36000,
		boardingType: BoardingType.HOUSE,
		genderPref: GenderPref.MALE,
		nearUniversity: "UoM Galle Centre",
		latitude: 6.0535,
		longitude: 80.221,
		maxOccupants: 5,
		currentOccupants: 3,
		status: BoardingStatus.ACTIVE,
		ownerEmail: "owner.amal@unistay.local",
		amenities: [
			BoardingAmenityType.HOT_WATER,
			BoardingAmenityType.KITCHEN,
			BoardingAmenityType.BALCONY,
			BoardingAmenityType.WATER_TANK,
		],
		rules: ["No loud music after 9:00 PM", "Water and electricity usage monitored"],
		imageSeeds: ["sunset-house-1"],
	},
	{
		title: "Mosswood Lodge",
		slug: "mosswood-lodge",
		description:
			"Newly renovated lodge waiting for approval with premium rooms and secure access.",
		city: "Moratuwa",
		district: "Colombo",
		address: "9 Station Road, Moratuwa",
		monthlyRent: 33000,
		boardingType: BoardingType.SINGLE_ROOM,
		genderPref: GenderPref.ANY,
		nearUniversity: "University of Moratuwa",
		latitude: 6.773,
		longitude: 79.8815,
		maxOccupants: 4,
		currentOccupants: 0,
		status: BoardingStatus.PENDING_APPROVAL,
		ownerEmail: "owner.nisansala@unistay.local",
		amenities: [
			BoardingAmenityType.WIFI,
			BoardingAmenityType.SECURITY,
			BoardingAmenityType.LAUNDRY,
			BoardingAmenityType.HOT_WATER,
		],
		rules: ["No subleasing", "Report maintenance issues immediately"],
		imageSeeds: ["mosswood-lodge-1", "mosswood-lodge-2"],
	},
	{
		title: "Palm Grove Rooms",
		slug: "palm-grove-rooms",
		description:
			"Budget-friendly single rooms close to the city center and bus stand.",
		city: "Jaffna",
		district: "Jaffna",
		address: "12 Temple Road, Jaffna",
		monthlyRent: 24000,
		boardingType: BoardingType.SINGLE_ROOM,
		genderPref: GenderPref.ANY,
		nearUniversity: "University of Jaffna",
		latitude: 9.6615,
		longitude: 80.0255,
		maxOccupants: 6,
		currentOccupants: 2,
		status: BoardingStatus.REJECTED,
		rejectionReason: "Needs updated fire safety documentation",
		ownerEmail: "owner.amal@unistay.local",
		amenities: [BoardingAmenityType.WIFI, BoardingAmenityType.PARKING, BoardingAmenityType.COMMON_AREA],
		rules: ["No overnight visitors without approval"],
		imageSeeds: ["palm-grove-rooms-1"],
	},
];

const marketplaceFixtures = [
	{
		title: "Study Desk with Chair",
		description: "Solid pine desk and ergonomic chair, ideal for student rooms.",
		adType: MarketplaceAdType.SELL,
		category: "Furniture",
		itemCondition: MarketplaceCondition.GOOD,
		price: 14500,
		city: "Colombo",
		district: "Colombo",
		status: MarketplaceStatus.ACTIVE,
		ownerEmail: "owner.amal@unistay.local",
		imageSeeds: ["study-desk-chair-1"],
	},
	{
		title: "Mini Fridge",
		description: "Working mini fridge, perfect for a shared boarding kitchen.",
		adType: MarketplaceAdType.SELL,
		category: "Electronics",
		itemCondition: MarketplaceCondition.LIKE_NEW,
		price: 28000,
		city: "Kandy",
		district: "Kandy",
		status: MarketplaceStatus.ACTIVE,
		ownerEmail: "owner.nisansala@unistay.local",
		imageSeeds: ["mini-fridge-1"],
	},
	{
		title: "Rice Cooker Giveaway",
		description: "Free rice cooker available for pickup near Moratuwa.",
		adType: MarketplaceAdType.GIVEAWAY,
		category: "Kitchen",
		itemCondition: MarketplaceCondition.GOOD,
		city: "Moratuwa",
		district: "Colombo",
		status: MarketplaceStatus.ACTIVE,
		ownerEmail: "owner.amal@unistay.local",
		imageSeeds: ["rice-cooker-1"],
	},
];

async function clearDatabase(): Promise<void> {
	await Promise.all([
		ReviewCommentReaction.deleteMany({}),
		ReviewReaction.deleteMany({}),
		ReviewComment.deleteMany({}),
		Review.deleteMany({}),
		Payment.deleteMany({}),
		RentalPeriod.deleteMany({}),
		Reservation.deleteMany({}),
		VisitRequest.deleteMany({}),
		SavedBoarding.deleteMany({}),
		BoardingImage.deleteMany({}),
		BoardingAmenity.deleteMany({}),
		BoardingRule.deleteMany({}),
		Boarding.deleteMany({}),
		MarketplaceItem.deleteMany({}),
		MarketplaceReport.deleteMany({}),
		AdminAction.deleteMany({}),
		Issue.deleteMany({}),
		RefreshToken.deleteMany({}),
		PasswordResetToken.deleteMany({}),
		EmailVerificationToken.deleteMany({}),
		User.deleteMany({}),
	]);
}

async function seedUsers() {
	const createdUsers = await User.insertMany(
		demoUsers.map((user) => ({
			...user,
			passwordHash,
			isVerified: true,
			isActive: true,
		})),
	);

	return new Map(createdUsers.map((user) => [user.email, user]));
}

async function seedBoardings(users: Map<string, Awaited<ReturnType<typeof User.insertMany>>[number]>) {
	const boardingDocs = [] as Awaited<ReturnType<typeof Boarding.insertMany>>;

	for (const fixture of boardingFixtures) {
		const owner = users.get(fixture.ownerEmail);

		if (!owner) {
			throw new Error(`Missing owner for boarding fixture: ${fixture.title}`);
		}

		const [boarding] = await Boarding.create([
			{
				ownerId: owner._id,
				title: fixture.title,
				slug: fixture.slug,
				description: fixture.description,
				city: fixture.city,
				district: fixture.district,
				address: fixture.address,
				monthlyRent: fixture.monthlyRent,
				boardingType: fixture.boardingType,
				genderPref: fixture.genderPref,
				nearUniversity: fixture.nearUniversity,
				latitude: fixture.latitude,
				longitude: fixture.longitude,
				maxOccupants: fixture.maxOccupants,
				currentOccupants: fixture.currentOccupants,
				status: fixture.status,
				rejectionReason: fixture.rejectionReason,
			},
		]);

		boardingDocs.push(boarding);

		await BoardingAmenity.insertMany(
			fixture.amenities.map((name) => ({ boardingId: boarding._id, name })),
		);
		await BoardingRule.insertMany(
			fixture.rules.map((rule) => ({ boardingId: boarding._id, rule })),
		);
		await BoardingImage.insertMany(
			fixture.imageSeeds.map((seed, index) => ({
				boardingId: boarding._id,
				url: `https://picsum.photos/seed/${seed}/1200/800`,
				publicId: `demo/${fixture.slug}/${index + 1}`,
			})),
		);
	}

	return boardingDocs;
}

async function seedSavedBoardings(users: Map<string, Awaited<ReturnType<typeof User.insertMany>>[number]>, boardings: Awaited<ReturnType<typeof Boarding.insertMany>>) {
	const studentKavindu = users.get("student.kavindu@unistay.local");
	const studentTharushi = users.get("student.tharushi@unistay.local");

	if (!studentKavindu || !studentTharushi) {
		throw new Error("Missing demo students");
	}

	await SavedBoarding.insertMany([
		{ boardingId: boardings[0]._id, studentId: studentKavindu._id },
		{ boardingId: boardings[1]._id, studentId: studentKavindu._id },
		{ boardingId: boardings[2]._id, studentId: studentKavindu._id },
		{ boardingId: boardings[0]._id, studentId: studentTharushi._id },
	]);
}

async function seedReservations(
	users: Map<string, Awaited<ReturnType<typeof User.insertMany>>[number]>,
	boardings: Awaited<ReturnType<typeof Boarding.insertMany>>,
) {
	const studentKavindu = users.get("student.kavindu@unistay.local");
	const studentTharushi = users.get("student.tharushi@unistay.local");

	if (!studentKavindu || !studentTharushi) {
		throw new Error("Missing demo students");
	}

	const [activeReservation] = await Reservation.create([
		{
			studentId: studentKavindu._id,
			boardingId: boardings[0]._id,
			status: ReservationStatus.ACTIVE,
			moveInDate: daysFromNow(7),
			specialRequests: "Need a quiet room near the study area.",
			rentSnapshot: 42000,
			boardingSnapshot: {
				title: boardings[0].title,
				city: boardings[0].city,
				district: boardings[0].district,
				monthlyRent: boardings[0].monthlyRent,
				boardingType: boardings[0].boardingType,
				genderPref: boardings[0].genderPref,
				address: boardings[0].address,
			},
			expiresAt: daysFromNow(10),
		},
	]);

	const [completedReservation] = await Reservation.create([
		{
			studentId: studentTharushi._id,
			boardingId: boardings[1]._id,
			status: ReservationStatus.COMPLETED,
			moveInDate: daysAgo(92),
			specialRequests: "Prefer a room with natural light.",
			rentSnapshot: 28500,
			boardingSnapshot: {
				title: boardings[1].title,
				city: boardings[1].city,
				district: boardings[1].district,
				monthlyRent: boardings[1].monthlyRent,
				boardingType: boardings[1].boardingType,
				genderPref: boardings[1].genderPref,
				address: boardings[1].address,
			},
			expiresAt: daysAgo(85),
		},
	]);

	const [pendingReservation] = await Reservation.create([
		{
			studentId: studentKavindu._id,
			boardingId: boardings[2]._id,
			status: ReservationStatus.PENDING,
			moveInDate: daysFromNow(21),
			specialRequests: "Can I visit before confirming?",
			rentSnapshot: 36000,
			boardingSnapshot: {
				title: boardings[2].title,
				city: boardings[2].city,
				district: boardings[2].district,
				monthlyRent: boardings[2].monthlyRent,
				boardingType: boardings[2].boardingType,
				genderPref: boardings[2].genderPref,
				address: boardings[2].address,
			},
			expiresAt: daysFromNow(4),
		},
	]);

	return { activeReservation, completedReservation, pendingReservation };
}

async function seedRentalPeriodsAndPayments(
	users: Map<string, Awaited<ReturnType<typeof User.insertMany>>[number]>,
	reservations: Awaited<ReturnType<typeof Reservation.insertMany>>,
) {
	const studentKavindu = users.get("student.kavindu@unistay.local");
	const studentTharushi = users.get("student.tharushi@unistay.local");

	if (!studentKavindu || !studentTharushi) {
		throw new Error("Missing demo students");
	}

	const activePeriods = await RentalPeriod.insertMany([
		{
			reservationId: reservations.activeReservation._id,
			periodLabel: "Month 1",
			dueDate: daysFromNow(10),
			amountDue: 42000,
			status: RentalPeriodStatus.PAID,
		},
		{
			reservationId: reservations.activeReservation._id,
			periodLabel: "Month 2",
			dueDate: daysFromNow(40),
			amountDue: 42000,
			status: RentalPeriodStatus.UPCOMING,
		},
	]);

	const completedPeriods = await RentalPeriod.insertMany([
		{
			reservationId: reservations.completedReservation._id,
			periodLabel: "Stay Month 1",
			dueDate: daysAgo(60),
			amountDue: 28500,
			status: RentalPeriodStatus.PAID,
		},
		{
			reservationId: reservations.completedReservation._id,
			periodLabel: "Stay Month 2",
			dueDate: daysAgo(30),
			amountDue: 28500,
			status: RentalPeriodStatus.PAID,
		},
	]);

	await Payment.insertMany([
		{
			rentalPeriodId: activePeriods[0]._id,
			reservationId: reservations.activeReservation._id,
			studentId: studentKavindu._id,
			amount: 42000,
			paymentMethod: PaymentMethod.ONLINE,
			referenceNumber: "PAY-UNI-1001",
			status: PaymentStatus.CONFIRMED,
			paidAt: daysAgo(2),
			confirmedAt: daysAgo(1),
		},
		{
			rentalPeriodId: completedPeriods[0]._id,
			reservationId: reservations.completedReservation._id,
			studentId: studentTharushi._id,
			amount: 28500,
			paymentMethod: PaymentMethod.BANK_TRANSFER,
			referenceNumber: "PAY-UNI-1002",
			status: PaymentStatus.CONFIRMED,
			paidAt: daysAgo(58),
			confirmedAt: daysAgo(57),
		},
	]);

	return { activePeriods, completedPeriods };
}

async function seedVisitRequests(
	users: Map<string, Awaited<ReturnType<typeof User.insertMany>>[number]>,
	boardings: Awaited<ReturnType<typeof Boarding.insertMany>>,
) {
	const studentKavindu = users.get("student.kavindu@unistay.local");
	const studentTharushi = users.get("student.tharushi@unistay.local");

	if (!studentKavindu || !studentTharushi) {
		throw new Error("Missing demo students");
	}

	await VisitRequest.insertMany([
		{
			studentId: studentKavindu._id,
			boardingId: boardings[2]._id,
			status: VisitRequestStatus.APPROVED,
			requestedStartAt: daysFromNow(2),
			requestedEndAt: daysFromNow(2),
			message: "I would like to inspect the room and common areas.",
			expiresAt: daysFromNow(1),
		},
		{
			studentId: studentTharushi._id,
			boardingId: boardings[0]._id,
			status: VisitRequestStatus.PENDING,
			requestedStartAt: daysFromNow(4),
			requestedEndAt: daysFromNow(4),
			message: "Can I visit after classes?",
			expiresAt: daysFromNow(2),
		},
	]);
}

async function seedReviewsAndReactions(
	users: Map<string, Awaited<ReturnType<typeof User.insertMany>>[number]>,
	boardings: Awaited<ReturnType<typeof Boarding.insertMany>>,
) {
	const studentKavindu = users.get("student.kavindu@unistay.local");
	const studentTharushi = users.get("student.tharushi@unistay.local");
	const ownerAmal = users.get("owner.amal@unistay.local");

	if (!studentKavindu || !studentTharushi || !ownerAmal) {
		throw new Error("Missing demo users for reviews");
	}

	const [review] = await Review.create([
		{
			boardingId: boardings[1]._id,
			studentId: studentTharushi._id,
			rating: 5,
			comment:
				"Great environment for studying, friendly owner, and the shared spaces were always clean.",
			likeCount: 2,
			dislikeCount: 0,
			images: ["https://picsum.photos/seed/review-campus-breeze-1/1200/800"],
		},
	]);

	const [comment] = await ReviewComment.create([
		{
			reviewId: review._id,
			commentorId: ownerAmal._id,
			comment: "Thanks for the feedback. We have added extra study lamps in the lounge.",
			likeCount: 1,
			dislikeCount: 0,
		},
	]);

	await ReviewReaction.insertMany([
		{
			reviewId: review._id,
			userId: studentKavindu._id,
			type: ReactionType.LIKE,
		},
		{
			reviewId: review._id,
			userId: ownerAmal._id,
			type: ReactionType.LIKE,
		},
	]);

	await ReviewCommentReaction.insertMany([
		{
			reviewCommentId: comment._id,
			userId: studentTharushi._id,
			type: ReactionType.LIKE,
		},
	]);
}

async function seedMarketplace(users: Map<string, Awaited<ReturnType<typeof User.insertMany>>[number]>) {
	const ownerAmal = users.get("owner.amal@unistay.local");
	const ownerNisansala = users.get("owner.nisansala@unistay.local");

	if (!ownerAmal || !ownerNisansala) {
		throw new Error("Missing owners for marketplace items");
	}

	await MarketplaceItem.insertMany([
		{
			sellerId: ownerAmal._id,
			title: "Study Desk with Chair",
			description: "Solid pine desk and ergonomic chair, ideal for student rooms.",
			adType: MarketplaceAdType.SELL,
			category: "Furniture",
			itemCondition: MarketplaceCondition.GOOD,
			price: 14500,
			city: "Colombo",
			district: "Colombo",
			status: MarketplaceStatus.ACTIVE,
			images: [
				{ url: "https://picsum.photos/seed/study-desk-chair-1/1200/800", publicId: "marketplace/study-desk-chair/1", createdAt: now },
			],
		},
		{
			sellerId: ownerNisansala._id,
			title: "Mini Fridge",
			description: "Working mini fridge, perfect for a shared boarding kitchen.",
			adType: MarketplaceAdType.SELL,
			category: "Electronics",
			itemCondition: MarketplaceCondition.LIKE_NEW,
			price: 28000,
			city: "Kandy",
			district: "Kandy",
			status: MarketplaceStatus.ACTIVE,
			images: [
				{ url: "https://picsum.photos/seed/mini-fridge-1/1200/800", publicId: "marketplace/mini-fridge/1", createdAt: now },
			],
		},
		{
			sellerId: ownerAmal._id,
			title: "Rice Cooker Giveaway",
			description: "Free rice cooker available for pickup near Moratuwa.",
			adType: MarketplaceAdType.GIVEAWAY,
			category: "Kitchen",
			itemCondition: MarketplaceCondition.GOOD,
			city: "Moratuwa",
			district: "Colombo",
			status: MarketplaceStatus.ACTIVE,
			images: [
				{ url: "https://picsum.photos/seed/rice-cooker-1/1200/800", publicId: "marketplace/rice-cooker/1", createdAt: now },
			],
		},
	]);
}

async function main() {
	await connectDB();

	try {
		console.log("[Seed] Clearing existing data...");
		await clearDatabase();

		console.log("[Seed] Creating demo users...");
		const users = await seedUsers();

		console.log("[Seed] Creating demo boardings...");
		const boardings = await seedBoardings(users);

		console.log("[Seed] Creating saved boardings, reservations, payments, and reviews...");
		await seedSavedBoardings(users, boardings);
		const reservations = await seedReservations(users, boardings);
		await seedRentalPeriodsAndPayments(users, reservations);
		await seedVisitRequests(users, boardings);
		await seedReviewsAndReactions(users, boardings);

		console.log("[Seed] Creating demo marketplace items...");
		await seedMarketplace(users);

		console.log("[Seed] Demo database seeded successfully.");
		console.log(`[Seed] Demo login password: ${demoPassword}`);
		console.table(
			demoUsers.map((user) => ({
				email: user.email,
				role: user.role,
				password: demoPassword,
			})),
		);
	} finally {
		await disconnectDB();
	}
}

main().catch((error) => {
	console.error("[Seed] Failed to seed demo data:", error);
	process.exitCode = 1;
});