import { PrismaClient, UserType, StaffRole, FirmStatus, OrgUserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create demo firm
  const firm = await prisma.firm.upsert({
    where: { slug: 'demo-firm' },
    update: {},
    create: {
      name: 'Demo CS Firm',
      slug: 'demo-firm',
      domain: 'demo.csfirm.local',
      status: FirmStatus.ACTIVE,
      settings: {
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        features: {},
      },
    },
  });
  console.log(`  Firm: ${firm.name} (${firm.id})`);

  // 2. Create master admin
  const adminPasswordHash = await bcrypt.hash('Admin@123456', 12);
  const masterAdmin = await prisma.user.upsert({
    where: { firmId_email: { firmId: firm.id, email: 'admin@demo.csfirm.local' } },
    update: {},
    create: {
      email: 'admin@demo.csfirm.local',
      passwordHash: adminPasswordHash,
      firstName: 'Master',
      lastName: 'Admin',
      userType: UserType.STAFF,
      firmId: firm.id,
    },
  });
  await prisma.employeeProfile.upsert({
    where: { userId: masterAdmin.id },
    update: {},
    create: {
      userId: masterAdmin.id,
      firmId: firm.id,
      role: StaffRole.MASTER_ADMIN,
      specializations: [],
      maxCases: 0,
    },
  });
  console.log(`  Master Admin: ${masterAdmin.email}`);

  // 3. Create employees
  const empPassword = await bcrypt.hash('Employee@123', 12);
  const employees = [
    { email: 'employee1@demo.csfirm.local', firstName: 'Priya', lastName: 'Sharma', role: StaffRole.EMPLOYEE, specializations: ['COMPANY_INCORPORATION', 'ANNUAL_FILING'] },
    { email: 'employee2@demo.csfirm.local', firstName: 'Rahul', lastName: 'Patel', role: StaffRole.EMPLOYEE, specializations: ['ANNUAL_FILING', 'COMPLIANCE'] },
    { email: 'manager@demo.csfirm.local', firstName: 'Anita', lastName: 'Verma', role: StaffRole.MANAGER, specializations: ['COMPANY_INCORPORATION', 'ANNUAL_FILING', 'COMPLIANCE'] },
  ];

  for (const emp of employees) {
    const user = await prisma.user.upsert({
      where: { firmId_email: { firmId: firm.id, email: emp.email } },
      update: {},
      create: {
        email: emp.email,
        passwordHash: empPassword,
        firstName: emp.firstName,
        lastName: emp.lastName,
        userType: UserType.STAFF,
        firmId: firm.id,
      },
    });
    await prisma.employeeProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        firmId: firm.id,
        role: emp.role,
        specializations: emp.specializations,
        maxCases: 20,
      },
    });
    console.log(`  Employee: ${user.email} (${emp.role})`);
  }

  // 4. Create client user + organization
  const clientPassword = await bcrypt.hash('Client@123', 12);
  const clientUser = await prisma.user.upsert({
    where: { firmId_email: { firmId: firm.id, email: 'client@acme.com' } },
    update: {},
    create: {
      email: 'client@acme.com',
      passwordHash: clientPassword,
      firstName: 'Rajesh',
      lastName: 'Kumar',
      userType: UserType.CLIENT,
      firmId: firm.id,
    },
  });

  // Find or create organization
  let org = await prisma.organization.findFirst({
    where: { firmId: firm.id, name: 'Acme Private Limited' },
  });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Acme Private Limited',
        cin: 'U74999MH2020PTC123456',
        registeredAddress: { street: '123 Business Park', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
        firmId: firm.id,
        metadata: {},
      },
    });
  }

  // Link client user to org
  const existingOrgUser = await prisma.orgUser.findUnique({
    where: { userId_orgId: { userId: clientUser.id, orgId: org.id } },
  });
  if (!existingOrgUser) {
    await prisma.orgUser.create({
      data: {
        orgId: org.id,
        userId: clientUser.id,
        firmId: firm.id,
        role: OrgUserRole.OWNER,
      },
    });
  }
  console.log(`  Client: ${clientUser.email} → ${org.name}`);

  // 5. Create service templates
  const services = [
    {
      name: 'Company Incorporation',
      slug: 'company-incorporation',
      category: 'COMPANY_INCORPORATION',
      description: 'New company incorporation under Companies Act 2013',
      billingTemplate: { basePrice: 15000 },
      documentRequirements: ['PAN Card', 'Aadhar Card', 'Address Proof', 'MOA', 'AOA', 'DIR-2'],
      formSchema: {
        sections: [
          {
            title: 'Company Details',
            fields: [
              { name: 'companyName', type: 'text', label: 'Proposed Company Name', required: true },
              { name: 'companyType', type: 'select', label: 'Company Type', required: true, options: ['Private Limited', 'Public Limited', 'OPC', 'Section 8'] },
              { name: 'authorizedCapital', type: 'number', label: 'Authorized Capital (INR)', required: true },
              { name: 'registeredAddress', type: 'textarea', label: 'Registered Office Address', required: true },
            ],
          },
          {
            title: 'Director Details',
            fields: [
              { name: 'numberOfDirectors', type: 'number', label: 'Number of Directors', required: true },
              { name: 'dinNumbers', type: 'text', label: 'DIN Numbers (comma separated)', required: false },
            ],
          },
        ],
      },
      slaConfig: { defaultDays: 15, warningDays: 12 },
    },
    {
      name: 'Annual Filing (ROC)',
      slug: 'annual-filing-roc',
      category: 'ANNUAL_FILING',
      description: 'Annual return and financial statement filing with ROC',
      billingTemplate: { basePrice: 8000 },
      documentRequirements: ['Board Resolution', 'Financial Statements', 'Director Report', 'Auditor Report'],
      formSchema: {
        sections: [
          {
            title: 'Filing Details',
            fields: [
              { name: 'financialYear', type: 'text', label: 'Financial Year', required: true },
              { name: 'agmDate', type: 'date', label: 'AGM Date', required: true },
              { name: 'turnover', type: 'number', label: 'Turnover (INR)', required: true },
            ],
          },
        ],
      },
      slaConfig: { defaultDays: 30, warningDays: 25 },
    },
    {
      name: 'Compliance Advisory',
      slug: 'compliance-advisory',
      category: 'COMPLIANCE',
      description: 'General compliance advisory and regulatory consultation',
      billingTemplate: { basePrice: 5000 },
      documentRequirements: [],
      formSchema: { sections: [{ title: 'Details', fields: [{ name: 'description', type: 'textarea', label: 'Describe your compliance query', required: true }] }] },
      slaConfig: { defaultDays: 7, warningDays: 5 },
    },
  ];

  for (const svc of services) {
    await prisma.serviceTemplate.create({
      data: {
        name: svc.name,
        slug: svc.slug,
        category: svc.category,
        description: svc.description,
        billingTemplate: svc.billingTemplate,
        documentRequirements: svc.documentRequirements,
        formSchema: svc.formSchema,
        slaConfig: svc.slaConfig,
        version: 1,
        isActive: true,
        firmId: firm.id,
      },
    });
    console.log(`  Service: ${svc.name}`);
  }

  console.log('\nSeed complete!');
  console.log('\nDemo credentials:');
  console.log('  Master Admin: admin@demo.csfirm.local / Admin@123456');
  console.log('  Manager:      manager@demo.csfirm.local / Employee@123');
  console.log('  Employee 1:   employee1@demo.csfirm.local / Employee@123');
  console.log('  Employee 2:   employee2@demo.csfirm.local / Employee@123');
  console.log('  Client:       client@acme.com / Client@123');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
