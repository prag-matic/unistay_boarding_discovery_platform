export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'STUDENT' | 'OWNER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
}

export interface Boarding {
  id: string;
  title: string;
  ownerName: string;
  ownerPhone: string;
  location: string;
  monthlyRent: number;
  amenities: string[];
  updatedAt: string;
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED';
  description: string;
  occupancy: string;
  rentTerm: string;
  rules: string[];
  images: string[];
}

// Mock Data
let users: User[] = [
  { id: 'USR-001', firstName: 'Admin', lastName: 'User', email: 'admin@example.com', phone: '+94 77 000 0000', role: 'ADMIN', isActive: true, createdAt: new Date().toISOString() },
  { id: 'USR-002', firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+94 77 111 1111', role: 'STUDENT', isActive: true, createdAt: new Date().toISOString() },
];

let boardings: Boarding[] = [
  {
    id: '#BRD-9402',
    title: 'Starlight Premium Annex',
    ownerName: 'Samantha Perera',
    ownerPhone: '+94 77 123 4567',
    location: 'Colombo 07',
    monthlyRent: 45000,
    amenities: ['WiFi', 'AC'],
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'PENDING_APPROVAL',
    description: 'A premium annex located in the heart of Colombo 07. Recently renovated with modern furniture and high-end fittings. Ideally suited for professionals or postgraduate students seeking a quiet, secure environment. Private entrance and secure parking included.',
    occupancy: 'Max 02 persons',
    rentTerm: '6 Months Deposit',
    rules: ['No smoking allowed indoors', 'No pets permitted', 'Quiet hours: 10:00 PM - 6:00 AM'],
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD-a1BLD0hFxFKJvrAQvNg70eFZyayKn2aDHvygv_y2Zsj_g5IMPemISnJxkPrqVnWoKkuhxzKm1eHD1z2jlBRqAy4HMFtODscFRO-sObu82tN7y-8XpjxJEKtXWyD_l08uXMR5H0IZX9vv0aR_tNFVkBgADee2wByO95s1hDsRMAUd0abgv1lBYHDmbJVzzkj8OqBRLzqMdG7xjrWyRB-RWET092bfwfsVp2OavwjFwy28kbNsYP0GQPt5zFTIkGSp1IVDqGXzL68',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuALrTqxlvpF_nwC-am-LsauGQOaRTMLHiYlfa178okLKfZTlrgEUrJ_0734_6XA2-UajNggRhtfx9IYDZGGsV4eE7kpxDhsI33PN8ncS8WHuz7FU_qKqPolU_PfRftjpMYnweKgEZ0Hv5FWZJamqJOfl0y3dqKgbDK9qIx6XwE1fEGxWykNQ6erc4WfKt_MsXBrABQUkxZ76lM41_2e6E_moGkeJ_YRye9VnXaPJI9jkComH318cL8TOUepGoqOuQLgnH1nSjUr_Mo',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDiOirpmfEmZcA2fCQEhPtdDBtKnt8tM30n5Hgv3If_CCUpoTtAKzrDnP0ImaRSdwpS6HlBD2QXOvqglDwTAP4oNOdT7Rx4simTf62RE7wPJN7dcCnDrgr-vILbPug6H1EQVnnUJXklmRCW0llXbm3U5Z81VMSoDxlnDSr4lXEPn7hgOymXwxf9R-UGxvzpZM0zwKx4zWXZPNtA7YyQ5HbtX8WL8hEO9RbH86zAx4xcvRpfnfD5OUP8KVuNheFScv5v6LAfPbUbxYA'
    ]
  },
  {
    id: '#BRD-9398',
    title: 'Modern Studio Loft',
    ownerName: 'Kasun Kalhara',
    ownerPhone: '+94 71 999 8877',
    location: 'Kandy Central',
    monthlyRent: 28500,
    amenities: ['Parking'],
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    status: 'PENDING_APPROVAL',
    description: 'A modern studio loft in Kandy.',
    occupancy: 'Max 01 person',
    rentTerm: '3 Months Deposit',
    rules: ['No pets'],
    images: []
  },
  {
    id: '#BRD-9382',
    title: 'Riverside Shared Living',
    ownerName: 'Amara Fonseka',
    ownerPhone: '+94 77 444 3322',
    location: 'Galle District',
    monthlyRent: 18000,
    amenities: ['Water', 'Power'],
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    status: 'PENDING_APPROVAL',
    description: 'Shared living space near the river.',
    occupancy: 'Max 04 persons',
    rentTerm: '1 Month Deposit',
    rules: ['Quiet hours after 10PM'],
    images: []
  }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  getPendingBoardings: async () => {
    await delay(500);
    return {
      success: true,
      data: { boardings: boardings.filter(b => b.status === 'PENDING_APPROVAL') }
    };
  },
  approveBoarding: async (id: string) => {
    await delay(500);
    const boarding = boardings.find(b => b.id === id);
    if (!boarding) throw new Error('Boarding not found');
    boarding.status = 'ACTIVE';
    return { success: true, message: 'Boarding approved successfully', data: { boarding } };
  },
  rejectBoarding: async (id: string, reason: string) => {
    await delay(500);
    if (!reason) throw new Error('Rejection reason is required');
    const boarding = boardings.find(b => b.id === id);
    if (!boarding) throw new Error('Boarding not found');
    boarding.status = 'REJECTED';
    return { success: true, message: 'Boarding rejected successfully', data: { boarding } };
  },
  getUsers: async (page = 1, size = 20) => {
    await delay(500);
    return {
      success: true,
      data: { users, pagination: { page, size, total: users.length, totalPages: 1 } }
    };
  },
  activateUser: async (id: string) => {
    await delay(500);
    const user = users.find(u => u.id === id);
    if (!user) throw new Error('User not found');
    user.isActive = true;
    return { success: true, message: 'User activated', data: { user } };
  },
  deactivateUser: async (id: string) => {
    await delay(500);
    const user = users.find(u => u.id === id);
    if (!user) throw new Error('User not found');
    user.isActive = false;
    return { success: true, message: 'User deactivated', data: { user } };
  }
};
