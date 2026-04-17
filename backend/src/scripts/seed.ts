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
	MarketplaceReportReason,
	MarketplaceReportStatus,
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

type DemoReservationRef = { _id: unknown };

type DemoReservationSet = {
	activeReservation: DemoReservationRef;
	completedReservation: DemoReservationRef;
	pendingReservation: DemoReservationRef;
	rejectedReservation: DemoReservationRef;
	cancelledReservation: DemoReservationRef;
	expiredReservation: DemoReservationRef;
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
		city: "Malabe",
		district: "Colombo",
		address: "42 Harbour Road, Colombo 03",
		monthlyRent: 42000,
		boardingType: BoardingType.ANNEX,
		genderPref: GenderPref.ANY,
		nearUniversity: "Sri Lanka Institute of Information Technology",
		latitude: 6.915450283616512,
		longitude: 79.97268866642749,
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
		city: "Malabe",
		district: "Colombo",
		address: "18 Peradeniya Road, Kandy",
		monthlyRent: 28500,
		boardingType: BoardingType.SHARED_ROOM,
		genderPref: GenderPref.FEMALE,
		nearUniversity: "Sri Lanka Institute of Information Technology",
		latitude: 6.9161023412291,
		longitude: 79.9734425128002,
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
		city: "Malabe",
		district: "Colombo",
		address: "77 Lighthouse Street, Galle",
		monthlyRent: 36000,
		boardingType: BoardingType.HOUSE,
		genderPref: GenderPref.MALE,
		nearUniversity: "Sri Lanka Institute of Information Technology",
		latitude: 6.9148219077304,
		longitude: 79.9719831254417,
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
		city: "Malabe",
		district: "Colombo",
		address: "9 Station Road, Moratuwa",
		monthlyRent: 33000,
		boardingType: BoardingType.SINGLE_ROOM,
		genderPref: GenderPref.ANY,
		nearUniversity: "Sri Lanka Institute of Information Technology",
		latitude: 6.9170341152819,
		longitude: 79.9721129041885,
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
		city: "Malabe",
		district: "Colombo",
		address: "12 Temple Road, Jaffna",
		monthlyRent: 24000,
		boardingType: BoardingType.SINGLE_ROOM,
		genderPref: GenderPref.ANY,
		nearUniversity: "Sri Lanka Institute of Information Technology",
		latitude: 6.9139885226743,
		longitude: 79.9730091445562,
		maxOccupants: 6,
		currentOccupants: 2,
		status: BoardingStatus.REJECTED,
		rejectionReason: "Needs updated fire safety documentation",
		ownerEmail: "owner.amal@unistay.local",
		amenities: [BoardingAmenityType.WIFI, BoardingAmenityType.PARKING, BoardingAmenityType.COMMON_AREA],
		rules: ["No overnight visitors without approval"],
		imageSeeds: ["palm-grove-rooms-1"],
	},
	{
		title: "Lake Side Student Hub",
		slug: "lake-side-student-hub",
		description:
			"Quiet lake-facing property with study cubicles, backup power, and meal plans.",
		city: "Malabe",
		district: "Colombo",
		address: "65 Beach Road, Matara",
		monthlyRent: 31500,
		boardingType: BoardingType.SHARED_ROOM,
		genderPref: GenderPref.ANY,
		nearUniversity: "Sri Lanka Institute of Information Technology",
		latitude: 6.9164877749011,
		longitude: 79.9717765223098,
		maxOccupants: 10,
		currentOccupants: 7,
		status: BoardingStatus.ACTIVE,
		ownerEmail: "owner.nisansala@unistay.local",
		amenities: [
			BoardingAmenityType.WIFI,
			BoardingAmenityType.STUDY_ROOM,
			BoardingAmenityType.GENERATOR,
			BoardingAmenityType.COMMON_AREA,
		],
		rules: ["Meal plan signup required", "No cooking in rooms", "Quiet study hours after 8:00 PM"],
		imageSeeds: ["lake-side-student-hub-1", "lake-side-student-hub-2"],
	},
	{
		title: "City Corner Annex",
		slug: "city-corner-annex",
		description:
			"Compact annex close to transport links; currently paused for minor maintenance.",
		city: "Malabe",
		district: "Colombo",
		address: "109 Main Street, Negombo",
		monthlyRent: 29500,
		boardingType: BoardingType.ANNEX,
		genderPref: GenderPref.FEMALE,
		nearUniversity: "Sri Lanka Institute of Information Technology",
		latitude: 6.9143926305532,
		longitude: 79.9740182217346,
		maxOccupants: 4,
		currentOccupants: 2,
		status: BoardingStatus.INACTIVE,
		ownerEmail: "owner.amal@unistay.local",
		amenities: [
			BoardingAmenityType.WIFI,
			BoardingAmenityType.HOT_WATER,
			BoardingAmenityType.SECURITY,
		],
		rules: ["No parties", "Monthly inspection notice provided 24h in advance"],
		imageSeeds: ["city-corner-annex-1"],
	},
	{
		title: "Green Court Lodge",
		slug: "green-court-lodge",
		description:
			"New listing draft with eco-friendly rooms and courtyard seating, not submitted yet.",
		city: "Malabe",
		district: "Colombo",
		address: "7 Lake Round, Kurunegala",
		monthlyRent: 27000,
		boardingType: BoardingType.SINGLE_ROOM,
		genderPref: GenderPref.ANY,
		nearUniversity: "Sri Lanka Institute of Information Technology",
		latitude: 6.9159081394407,
		longitude: 79.9722643891903,
		maxOccupants: 6,
		currentOccupants: 0,
		status: BoardingStatus.DRAFT,
		ownerEmail: "owner.nisansala@unistay.local",
		amenities: [
			BoardingAmenityType.WIFI,
			BoardingAmenityType.BALCONY,
			BoardingAmenityType.WATER_TANK,
		],
		rules: ["Draft rules pending approval"],
		imageSeeds: ["green-court-lodge-1"],
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
	{
		title: "Standing Fan",
		description: "Used standing fan in good condition, recently serviced.",
		adType: MarketplaceAdType.SELL,
		category: "Appliances",
		itemCondition: MarketplaceCondition.FAIR,
		price: 6500,
		city: "Galle",
		district: "Galle",
		status: MarketplaceStatus.ACTIVE,
		ownerEmail: "owner.amal@unistay.local",
		imageSeeds: ["standing-fan-1"],
	},
	{
		title: "Old Exam Paper Bundle",
		description: "Past papers and notes bundle available free for pickup.",
		adType: MarketplaceAdType.GIVEAWAY,
		category: "Books",
		itemCondition: MarketplaceCondition.GOOD,
		city: "Colombo",
		district: "Colombo",
		status: MarketplaceStatus.TAKEN_DOWN,
		ownerEmail: "owner.nisansala@unistay.local",
		imageSeeds: ["exam-paper-bundle-1"],
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
		{ boardingId: boardings[5]._id, studentId: studentKavindu._id },
		{ boardingId: boardings[6]._id, studentId: studentKavindu._id },
		{ boardingId: boardings[0]._id, studentId: studentTharushi._id },
		{ boardingId: boardings[3]._id, studentId: studentTharushi._id },
		{ boardingId: boardings[5]._id, studentId: studentTharushi._id },
	]);
}

async function seedReservations(
	users: Map<string, Awaited<ReturnType<typeof User.insertMany>>[number]>,
	boardings: Awaited<ReturnType<typeof Boarding.insertMany>>,
): Promise<DemoReservationSet> {
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

	const [rejectedReservation] = await Reservation.create([
		{
			studentId: studentTharushi._id,
			boardingId: boardings[4]._id,
			status: ReservationStatus.REJECTED,
			moveInDate: daysFromNow(30),
			specialRequests: "Need a ground-floor room due to mobility concerns.",
			rentSnapshot: 24000,
			boardingSnapshot: {
				title: boardings[4].title,
				city: boardings[4].city,
				district: boardings[4].district,
				monthlyRent: boardings[4].monthlyRent,
				boardingType: boardings[4].boardingType,
				genderPref: boardings[4].genderPref,
				address: boardings[4].address,
			},
			rejectionReason: "Listing currently unavailable pending safety updates.",
			expiresAt: daysFromNow(6),
		},
	]);

	const [cancelledReservation] = await Reservation.create([
		{
			studentId: studentKavindu._id,
			boardingId: boardings[5]._id,
			status: ReservationStatus.CANCELLED,
			moveInDate: daysFromNow(15),
			specialRequests: "Would prefer upper floor with good ventilation.",
			rentSnapshot: 31500,
			boardingSnapshot: {
				title: boardings[5].title,
				city: boardings[5].city,
				district: boardings[5].district,
				monthlyRent: boardings[5].monthlyRent,
				boardingType: boardings[5].boardingType,
				genderPref: boardings[5].genderPref,
				address: boardings[5].address,
			},
			expiresAt: daysFromNow(3),
		},
	]);

	const [expiredReservation] = await Reservation.create([
		{
			studentId: studentTharushi._id,
			boardingId: boardings[6]._id,
			status: ReservationStatus.EXPIRED,
			moveInDate: daysFromNow(18),
			specialRequests: "Interested if internet speed is above 50Mbps.",
			rentSnapshot: 29500,
			boardingSnapshot: {
				title: boardings[6].title,
				city: boardings[6].city,
				district: boardings[6].district,
				monthlyRent: boardings[6].monthlyRent,
				boardingType: boardings[6].boardingType,
				genderPref: boardings[6].genderPref,
				address: boardings[6].address,
			},
			expiresAt: daysAgo(2),
		},
	]);

	return {
		activeReservation,
		completedReservation,
		pendingReservation,
		rejectedReservation,
		cancelledReservation,
		expiredReservation,
	};
}

async function seedRentalPeriodsAndPayments(
	users: Map<string, Awaited<ReturnType<typeof User.insertMany>>[number]>,
	reservations: DemoReservationSet,
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
		{
			reservationId: reservations.activeReservation._id,
			periodLabel: "Month 3",
			dueDate: daysAgo(5),
			amountDue: 42000,
			status: RentalPeriodStatus.PARTIALLY_PAID,
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
		{
			reservationId: reservations.completedReservation._id,
			periodLabel: "Stay Month 3",
			dueDate: daysAgo(5),
			amountDue: 28500,
			status: RentalPeriodStatus.PAID,
		},
	]);

	const expiredPeriods = await RentalPeriod.insertMany([
		{
			reservationId: reservations.expiredReservation._id,
			periodLabel: "Expired Month 1",
			dueDate: daysAgo(1),
			amountDue: 29500,
			status: RentalPeriodStatus.OVERDUE,
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
		{
			rentalPeriodId: activePeriods[2]._id,
			reservationId: reservations.activeReservation._id,
			studentId: studentKavindu._id,
			amount: 20000,
			paymentMethod: PaymentMethod.CASH,
			referenceNumber: "PAY-UNI-1003",
			status: PaymentStatus.CONFIRMED,
			paidAt: daysAgo(4),
			confirmedAt: daysAgo(3),
		},
		{
			rentalPeriodId: activePeriods[2]._id,
			reservationId: reservations.activeReservation._id,
			studentId: studentKavindu._id,
			amount: 22000,
			paymentMethod: PaymentMethod.BANK_TRANSFER,
			referenceNumber: "PAY-UNI-1004",
			status: PaymentStatus.PENDING,
			paidAt: daysAgo(1),
		},
		{
			rentalPeriodId: activePeriods[1]._id,
			reservationId: reservations.activeReservation._id,
			studentId: studentKavindu._id,
			amount: 42000,
			paymentMethod: PaymentMethod.ONLINE,
			referenceNumber: "PAY-UNI-1005",
			status: PaymentStatus.PENDING,
			paidAt: daysFromNow(-0.5),
		},
		{
			rentalPeriodId: completedPeriods[2]._id,
			reservationId: reservations.completedReservation._id,
			studentId: studentTharushi._id,
			amount: 28500,
			paymentMethod: PaymentMethod.ONLINE,
			referenceNumber: "PAY-UNI-1006",
			status: PaymentStatus.REJECTED,
			rejectionReason: "Reference number does not match bank statement.",
			paidAt: daysAgo(6),
		},
	]);

	return { activePeriods, completedPeriods, expiredPeriods };
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
		{
			studentId: studentKavindu._id,
			boardingId: boardings[5]._id,
			status: VisitRequestStatus.REJECTED,
			requestedStartAt: daysAgo(3),
			requestedEndAt: daysAgo(3),
			message: "Can I check room sharing options?",
			rejectionReason: "Selected time slot is unavailable.",
			expiresAt: daysAgo(2),
		},
		{
			studentId: studentTharushi._id,
			boardingId: boardings[6]._id,
			status: VisitRequestStatus.CANCELLED,
			requestedStartAt: daysFromNow(6),
			requestedEndAt: daysFromNow(6),
			message: "Need to reschedule due to exams.",
			expiresAt: daysFromNow(4),
		},
		{
			studentId: studentTharushi._id,
			boardingId: boardings[4]._id,
			status: VisitRequestStatus.EXPIRED,
			requestedStartAt: daysAgo(6),
			requestedEndAt: daysAgo(6),
			message: "Morning slot preferred.",
			expiresAt: daysAgo(5),
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
	const ownerNisansala = users.get("owner.nisansala@unistay.local");

	if (!studentKavindu || !studentTharushi || !ownerAmal || !ownerNisansala) {
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

	const [secondReview] = await Review.create([
		{
			boardingId: boardings[0]._id,
			studentId: studentKavindu._id,
			rating: 4,
			comment:
				"Convenient location and reliable Wi-Fi. Parking is limited during peak hours.",
			likeCount: 1,
			dislikeCount: 0,
			images: ["https://picsum.photos/seed/review-harbour-view-1/1200/800"],
		},
	]);

	const [secondComment] = await ReviewComment.create([
		{
			reviewId: secondReview._id,
			commentorId: ownerAmal._id,
			comment: "Thanks! We are adding two more parking spaces next month.",
			likeCount: 0,
			dislikeCount: 0,
		},
	]);

	await ReviewReaction.insertMany([
		{
			reviewId: secondReview._id,
			userId: studentTharushi._id,
			type: ReactionType.LIKE,
		},
		{
			reviewId: secondReview._id,
			userId: ownerNisansala._id,
			type: ReactionType.DISLIKE,
		},
	]);

	await ReviewCommentReaction.insertMany([
		{
			reviewCommentId: secondComment._id,
			userId: studentKavindu._id,
			type: ReactionType.LIKE,
		},
	]);
}

async function seedMarketplace(users: Map<string, Awaited<ReturnType<typeof User.insertMany>>[number]>) {
	const marketplaceDocs = marketplaceFixtures.map((fixture) => {
		const owner = users.get(fixture.ownerEmail);
		if (!owner) {
			throw new Error(`Missing owner for marketplace fixture: ${fixture.title}`);
		}

		return {
			sellerId: owner._id,
			title: fixture.title,
			description: fixture.description,
			adType: fixture.adType,
			category: fixture.category,
			itemCondition: fixture.itemCondition,
			...(fixture.price !== undefined && { price: fixture.price }),
			city: fixture.city,
			district: fixture.district,
			status: fixture.status,
			images: fixture.imageSeeds.map((seed, index) => ({
				url: `https://picsum.photos/seed/${seed}/1200/800`,
				publicId: `marketplace/${seed}/${index + 1}`,
				createdAt: now,
			})),
		};
	});

	await MarketplaceItem.insertMany(marketplaceDocs);
}

async function seedMarketplaceReportsAndAdminActions(
	users: Map<string, Awaited<ReturnType<typeof User.insertMany>>[number]>,
	boardings: Awaited<ReturnType<typeof Boarding.insertMany>>,
) {
	const admin = users.get("admin@unistay.local");
	const ownerAmal = users.get("owner.amal@unistay.local");
	const ownerNisansala = users.get("owner.nisansala@unistay.local");
	const studentKavindu = users.get("student.kavindu@unistay.local");
	const studentTharushi = users.get("student.tharushi@unistay.local");

	if (
		!admin ||
		!ownerAmal ||
		!ownerNisansala ||
		!studentKavindu ||
		!studentTharushi
	) {
		throw new Error("Missing users for marketplace report/admin action seed");
	}

	const marketplaceItems = await MarketplaceItem.find({})
		.select("_id title")
		.sort({ createdAt: 1 })
		.lean();

	if (marketplaceItems.length < 3) {
		throw new Error("Marketplace items not available for report seeding");
	}

	await MarketplaceReport.insertMany([
		{
			itemId: marketplaceItems[0]._id,
			reporterId: studentKavindu._id,
			reason: MarketplaceReportReason.OTHER,
			details: "Listing image appears outdated and does not match description.",
			status: MarketplaceReportStatus.OPEN,
		},
		{
			itemId: marketplaceItems[1]._id,
			reporterId: studentTharushi._id,
			reason: MarketplaceReportReason.SPAM,
			details: "Seller repeatedly reposted duplicate ad text.",
			status: MarketplaceReportStatus.RESOLVED,
			handledBy: admin._id,
			handledAt: daysAgo(2),
			notes: "Duplicate posts merged and warning issued.",
		},
		{
			itemId: marketplaceItems[2]._id,
			reporterId: ownerAmal._id,
			reason: MarketplaceReportReason.PROHIBITED_ITEM,
			details: "Potential restricted electrical item without safety details.",
			status: MarketplaceReportStatus.DISMISSED,
			handledBy: admin._id,
			handledAt: daysAgo(1),
			notes: "Reviewed details and found no policy breach.",
		},
	]);

	const payments = await Payment.find({})
		.select("_id status")
		.sort({ createdAt: -1 })
		.lean();
	const reviews = await Review.find({})
		.select("_id")
		.sort({ createdAt: -1 })
		.lean();

	await AdminAction.insertMany([
		{
			adminId: admin._id,
			action: "BOARDING_APPROVED",
			targetType: "BOARDING",
			targetIds: [String(boardings[0]._id)],
			metadata: {
				reason: "All required documents verified",
				previousStatus: "PENDING_APPROVAL",
				newStatus: "ACTIVE",
			},
			ipAddress: "127.0.0.1",
			userAgent: "seed-script",
		},
		{
			adminId: admin._id,
			action: "BOARDING_REJECTED",
			targetType: "BOARDING",
			targetIds: [String(boardings[4]._id)],
			metadata: {
				reason: "Needs updated fire safety documentation",
				ownerId: String(ownerAmal._id),
			},
			ipAddress: "127.0.0.1",
			userAgent: "seed-script",
		},
		{
			adminId: admin._id,
			action: "PAYMENT_REVIEWED",
			targetType: "PAYMENT",
			targetIds: payments.slice(0, 2).map((payment) => String(payment._id)),
			metadata: {
				note: "Mixed outcomes during moderation sweep",
				paymentStatuses: payments.slice(0, 2).map((payment) => payment.status),
			},
			ipAddress: "127.0.0.1",
			userAgent: "seed-script",
		},
		{
			adminId: admin._id,
			action: "MARKETPLACE_REPORT_BATCH_HANDLED",
			targetType: "SYSTEM",
			targetIds: marketplaceItems.slice(0, 3).map((item) => String(item._id)),
			metadata: {
				reviewedBy: String(admin._id),
				openReportsRemaining: 1,
			},
			ipAddress: "127.0.0.1",
			userAgent: "seed-script",
		},
		{
			adminId: admin._id,
			action: "REVIEW_MODERATION_NOTE",
			targetType: "REVIEW",
			targetIds: reviews.slice(0, 2).map((review) => String(review._id)),
			metadata: {
				note: "Checked for abusive language and policy compliance",
				reviewedOwnerIds: [String(ownerAmal._id), String(ownerNisansala._id)],
			},
			ipAddress: "127.0.0.1",
			userAgent: "seed-script",
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

		console.log("[Seed] Creating marketplace reports and admin action logs...");
		await seedMarketplaceReportsAndAdminActions(users, boardings);

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