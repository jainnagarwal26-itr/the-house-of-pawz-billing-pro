// ============================================================
// productionData.ts — Complete Production Reference Dataset
// Project: The House of Pawz – Billing Pro
// ============================================================

import { Invoice, Customer, Pet, Payment } from '../types';

export const PROD_CUSTOMERS: Customer[] = [
  { id: 'CUST-1001', name: 'Dilnavaz', phone: '98197 02638', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '98197 02638', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-01T00:00:00.000Z' },
  { id: 'CUST-1002', name: 'Anil Sadarangani', phone: '9819259507', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '9819259507', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-02T00:00:00.000Z' },
  { id: 'CUST-1003', name: 'Jeremy Dsouza', phone: '97736 54284', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '97736 54284', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-02T00:00:00.000Z' },
  { id: 'CUST-1004', name: 'Ashmita Chavan', phone: '77200 81724', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '77200 81724', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-02T00:00:00.000Z' },
  { id: 'CUST-1005', name: 'Dream Catchers', phone: '+91 98330 20003', email: '', address: '201/202, B Wing, 2nd Floor, Off New Link Road, Opp. Laxmi Industrial Estate, Andheri West, Mumbai, Suburban, Maharashtra, 400053', gstin: '27AMIPB3225A1ZS', stateCode: '27-Maharashtra', emergencyContact: '+91 98330 20003', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-03T00:00:00.000Z' },
  { id: 'CUST-1006', name: 'Saumya Srivastava', phone: '9967269139', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '9967269139', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-03T00:00:00.000Z' },
  { id: 'CUST-1007', name: 'Jyoti Rajani', phone: '96194 93717', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '96194 93717', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-03T00:00:00.000Z' },
  { id: 'CUST-1008', name: 'Long Story Short Pictures', phone: '9004001912', email: '', address: 'Flat no.109/47/Gwing, Leslie Sawhney Memorial chsl, Manish Nagar Road, Four Bungalows, Mumbai, Mumbai Suburban, Maharashtra, 400053', gstin: '27AWFPB6991G2ZB', stateCode: '27-Maharashtra', emergencyContact: '9004001912', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-04T00:00:00.000Z' },
  { id: 'CUST-1009', name: 'Trupti Gurav', phone: '98199 44463', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '98199 44463', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-04T00:00:00.000Z' },
  { id: 'CUST-1010', name: 'Pratibha Kolwalkar', phone: '98695 24047', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '98695 24047', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-04T00:00:00.000Z' },
  { id: 'CUST-1011', name: 'Darshana Patel', phone: '98198 87784', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '98198 87784', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-05T00:00:00.000Z' },
  { id: 'CUST-1012', name: 'Mayank Jangle', phone: '96191 19047', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '96191 19047', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-05T00:00:00.000Z' },
  { id: 'CUST-1013', name: 'Suchi Dahibavkar', phone: '97734 08857', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '97734 08857', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-06T00:00:00.000Z' },
  { id: 'CUST-1014', name: 'Priyanka Pardasani', phone: '+1 201-334-6533', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '+1 201-334-6533', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-07T00:00:00.000Z' },
  { id: 'CUST-1015', name: 'Shayoni Mitra', phone: '91589967399', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '91589967399', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-08T00:00:00.000Z' },
  { id: 'CUST-1016', name: 'Gaurav Khindaria', phone: '98204 72787', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '98204 72787', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-09T00:00:00.000Z' },
  { id: 'CUST-1017', name: 'Shaheen Bhatt', phone: '9833333737', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '9833333737', outstandingBalance: 0, advanceBalance: 1563, createdAt: '2026-07-09T00:00:00.000Z' },
  { id: 'CUST-1018', name: 'Shraddha Kutty', phone: '98195 38040', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '98195 38040', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-10T00:00:00.000Z' },
  { id: 'CUST-1019', name: 'Asha Merchant', phone: '98336 89870', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '98336 89870', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-12T00:00:00.000Z' },
  { id: 'CUST-1020', name: 'Puneet', phone: '98203 42406', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '98203 42406', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-12T00:00:00.000Z' },
  { id: 'CUST-1021', name: 'Subhadra Venkateswaran', phone: '9969888514', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '9969888514', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-12T00:00:00.000Z' },
  { id: 'CUST-1022', name: 'Shadab Sayyed', phone: '98335 82392', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '98335 82392', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-13T00:00:00.000Z' },
  { id: 'CUST-1023', name: 'Bimal Unnikrishnan', phone: '98206 12787', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '98206 12787', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-14T00:00:00.000Z' },
  { id: 'CUST-1024', name: 'Sunipa Ghosh', phone: '98200 48805', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '98200 48805', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-14T00:00:00.000Z' },
  { id: 'CUST-1025', name: 'Vinnuthna Bandaru', phone: '+1 (669) 214-8848', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '+1 (669) 214-8848', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-15T00:00:00.000Z' },
  { id: 'CUST-1026', name: 'Anita Rajan', phone: '98202 96620', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '98202 96620', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-16T00:00:00.000Z' },
  { id: 'CUST-1027', name: 'Anastasia Chowry', phone: '97693 72332', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '97693 72332', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-16T00:00:00.000Z' },
  { id: 'CUST-1028', name: 'Foram Srivastava', phone: '98673 38118', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '98673 38118', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-16T00:00:00.000Z' },
  { id: 'CUST-1029', name: 'Ishaan Srivastav', phone: '88796 33144', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '88796 33144', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-17T00:00:00.000Z' },
  { id: 'CUST-1030', name: 'Hridyansi Toor', phone: '98212 56972', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '98212 56972', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-17T00:00:00.000Z' },
  { id: 'CUST-1031', name: 'Rohit Roygaga', phone: '98204 43053', email: '', address: 'Mumbai, Maharashtra', gstin: '', stateCode: '27-Maharashtra', emergencyContact: '98204 43053', outstandingBalance: 0, advanceBalance: 0, createdAt: '2026-07-17T00:00:00.000Z' }
];

export const PROD_PETS: Pet[] = PROD_CUSTOMERS.map((c, i) => {
  const pName = i === 0 ? 'Mojito' : i === 1 ? 'Raf and Sheru' : i === 2 ? 'Jelly' : i === 3 ? 'Coco And Joon' : i === 4 ? 'Shadow' : 'Pet Care';
  return {
    id: `PET-${2001 + i}`,
    customerId: c.id,
    customerName: c.name,
    name: pName,
    petName: pName,
    species: 'Dog',
    breed: 'Standard',
    age: '2 Years',
    gender: 'Male',
    vaccinationStatus: 'Up to Date',
    isBoardingNow: false,
    createdAt: c.createdAt
  };
});
