# CSFIRM User Guide & Credentials

Complete guide for using the CSFIRM platform with all credentials, roles, and capabilities.

---

## 🚀 Quick Start

### Starting the Application

#### **Terminal 1: Backend API**
```bash
cd e:\CSFIRM
npx ts-node -r tsconfig-paths/register --project apps/api/tsconfig.json apps/api/src/main.ts
```

**Wait for:**
```
✓ Razorpay initialized successfully
✓ API Server running on: http://localhost:3000/api
```

#### **Terminal 2: Frontend**
```bash
cd e:\CSFIRM\apps\web
npm run dev
```

**Wait for:**
```
✓ Ready in 3.2s
  Local: http://localhost:3001
```

#### **Access URLs**
- **Frontend:** http://localhost:3001
- **API:** http://localhost:3000/api
- **API Docs:** http://localhost:3000/api/docs

---

## 🔑 Complete Credentials & User Roles

### 1. MASTER_ADMIN (Super Administrator)

```
URL: http://localhost:3001/login
Email: admin@demo.csfirm.local
Password: Admin@123456
Firm: Demo CS Firm
```

#### Access Level
Full system access across all modules

#### Capabilities
✅ **User Management**
- Create, edit, and delete staff members
- Create, edit, and delete client users
- Assign roles to staff (EMPLOYEE, MANAGER, ADMIN, MASTER_ADMIN)
- Manage user permissions

✅ **Service Management**
- Create and manage service templates
- Define service pricing and form schemas
- Configure service workflows

✅ **Organization Management**
- Create and manage client organizations
- Update organization details (CIN, PAN, GST, etc.)
- Manage organization contacts

✅ **Case Management**
- Create cases for any organization
- Assign cases to employees
- Transfer cases between employees
- Bulk operations (assign, flag, status update)
- View all cases across the firm

✅ **Document Management**
- Upload and organize documents
- Create folder hierarchies
- Tag documents with categories
- Access vault documents
- Manage document versions

✅ **Invoice Management**
- Create invoices with line items
- Issue invoices to clients
- Mark invoices as paid (manual)
- Download invoice PDFs
- View all invoices

✅ **Compliance Management**
- Create compliance deadlines
- Assign deadlines to cases/organizations
- Mark deadlines as complete
- Configure reminder notifications
- Support for MCA filings, tax deadlines, AGM, etc.

✅ **Analytics & Reporting**
- View firm-wide analytics
- Case distribution charts
- Revenue metrics
- Staff productivity reports
- Performance indicators

✅ **Audit & Security**
- Access complete audit logs
- View all system activities
- Filter logs by user, action, date
- Export audit data

✅ **System Settings**
- Configure firm settings
- Manage RBAC permissions
- System configuration

❌ **Restrictions**
- None - has complete access

---

### 2. MANAGER (Manager Role - Staff)

```
URL: http://localhost:3001/login
Email: manager@demo.csfirm.local
Password: Employee@123
Firm: Demo CS Firm
```

#### Access Level
Staff member with managerial permissions

#### Capabilities
✅ **Case Management**
- View and manage assigned cases
- Create new cases
- Update case status and progress
- Assign cases to team members (if authorized)
- Access case documents and chat

✅ **Organization Management**
- Create new client organizations
- Update organization details
- Manage organization contacts

✅ **Document Management**
- Upload case documents
- Organize in folders
- Add document tags
- Access non-vault documents

✅ **Invoice Management**
- Create invoices for cases
- Add line items and calculate totals
- Issue invoices to clients
- Mark invoices as paid (manual)
- Download invoice PDFs

✅ **Compliance Management**
- Create compliance deadlines
- Assign deadlines to cases
- Mark deadlines as complete
- View upcoming and overdue deadlines
- Configure reminder settings

✅ **Communication**
- Chat with team members
- Chat with clients on cases
- Internal case discussions
- Receive notifications

✅ **Limited Analytics**
- View team performance metrics
- Case statistics
- Revenue overview (limited scope)

❌ **Restrictions**
- Cannot manage users
- Cannot access full audit logs
- Cannot manage service templates
- Cannot access firm-wide settings
- Limited analytics access

---

### 3. EMPLOYEE (Regular Staff)

```
URL: http://localhost:3001/login
Email: employee1@demo.csfirm.local
Password: Employee@123
Firm: Demo CS Firm
```

#### Access Level
Basic staff member with task execution rights

#### Capabilities
✅ **Assigned Cases**
- View assigned cases only
- Update case status
- Add case notes and comments
- Track case progress

✅ **Document Management**
- Upload documents to assigned cases
- Organize documents in folders
- Add tags to documents
- View case documents

✅ **Compliance Tracking**
- View compliance deadlines for assigned cases
- Check due dates and status
- Monitor overdue items

✅ **Communication**
- Chat with clients on assigned cases
- Internal team chat
- Receive case notifications

✅ **Status Updates**
- Change case status following workflow:
  - PENDING → PROCESSING
  - PROCESSING → REVIEW
  - REVIEW → COMPLETED
- Add status change comments

❌ **Restrictions**
- Cannot create new cases
- Cannot create organizations
- Cannot manage invoices
- Cannot create compliance deadlines
- Cannot access analytics
- Cannot view other employees' cases (unless shared)
- No administrative access

---

### 4. CLIENT (Organization User)

```
URL: http://localhost:3001/login
Email: client@acme.com
Password: Client@123
Organization: Acme Corporation
```

#### Access Level
Client portal access only - view-only with payment capabilities

#### Capabilities
✅ **Dashboard**
- Client-specific dashboard
- Active cases count
- Pending invoices summary
- Upcoming compliance deadlines
- Overdue items tracking
- Recent activity feed

✅ **Case Tracking**
- View all cases for their organization
- See case status and progress
- Access case timeline
- View assigned staff members
- Track case milestones

✅ **Document Access**
- View case documents (non-sensitive)
- Download documents
- View document categories
- ❌ Cannot upload documents

✅ **Invoice Management**
- View all invoices
- See invoice details and line items
- **Pay invoices online via Razorpay**
- Download invoice PDFs
- View payment history

✅ **Compliance Tracking**
- View upcoming compliance deadlines
- See deadline details and due dates
- Filter by status (Upcoming, Due Soon, Overdue)
- Monitor critical deadlines

✅ **Communication**
- Chat with assigned case handlers
- View chat history
- Receive notifications

✅ **Notifications**
- Case status updates
- Invoice issued notifications
- Payment confirmations
- Deadline reminders
- Chat messages

✅ **Profile Settings**
- Update profile information
- Change password
- Notification preferences

❌ **Restrictions**
- Cannot create cases
- Cannot upload documents
- Cannot access other clients' data
- Cannot view staff-only information
- Cannot access analytics
- Cannot view audit logs
- Cannot modify case status
- Cannot create invoices

---

## 📋 Role Comparison Matrix

| Feature | Master Admin | Manager | Employee | Client |
|---------|--------------|---------|----------|--------|
| **Dashboard** | ✅ Full Analytics | ✅ Team Stats | ✅ My Cases | ✅ Client Portal |
| **View All Cases** | ✅ | ✅ Team Cases | ❌ Assigned Only | ✅ Own Cases |
| **Create Cases** | ✅ | ✅ | ❌ | ❌ |
| **Manage Users** | ✅ | ❌ | ❌ | ❌ |
| **Manage Services** | ✅ | ❌ | ❌ | ❌ |
| **Create Organizations** | ✅ | ✅ | ❌ | ❌ |
| **Upload Documents** | ✅ | ✅ | ✅ | ❌ |
| **Create Invoices** | ✅ | ✅ | ❌ | ❌ |
| **Pay Invoices** | N/A | N/A | N/A | ✅ Razorpay |
| **Create Compliance** | ✅ | ✅ | ❌ | ❌ |
| **View Analytics** | ✅ Full | ✅ Limited | ❌ | ❌ |
| **Audit Logs** | ✅ | ❌ | ❌ | ❌ |
| **Chat** | ✅ | ✅ | ✅ | ✅ |
| **Notifications** | ✅ | ✅ | ✅ | ✅ |
| **Bulk Operations** | ✅ | ✅ Limited | ❌ | ❌ |

---

## 🎯 Complete User Journey Examples

### Example 1: Master Admin - Complete Case Lifecycle

#### Step 1: Login
```
URL: http://localhost:3001/login
Email: admin@demo.csfirm.local
Password: Admin@123456
```

#### Step 2: Create Service Template
1. Navigate to **Services** (`/services`)
2. Click **"Add Service"**
3. Fill in:
   - **Name:** Annual Return Filing
   - **Description:** Complete annual return filing service
   - **Base Price:** 15000
   - **Slug:** annual-return-filing
4. Click **Save**

#### Step 3: Create Client Organization
1. Navigate to **Organizations** (`/organizations`)
2. Click **"Add Organization"**
3. Fill in:
   - **Name:** Tech Innovations Pvt Ltd
   - **Type:** PRIVATE_LIMITED
   - **CIN:** U72900DL2023PTC123456
   - **PAN:** AABCT1234C
   - **Email:** contact@techinnovations.com
   - **Phone:** +91-9876543210
4. Click **Save**

#### Step 4: Create Client User
1. Navigate to **Users** (`/users`)
2. Click **"Add User"**
3. Fill in:
   - **User Type:** CLIENT
   - **Email:** ceo@techinnovations.com
   - **First Name:** Raj
   - **Last Name:** Kumar
   - **Organization:** Tech Innovations Pvt Ltd
   - **Password:** Client@123
4. Click **Save**

#### Step 5: Create Case
1. Navigate to **Cases** (`/cases`)
2. Click **"New Case"**
3. Fill in:
   - **Organization:** Tech Innovations Pvt Ltd
   - **Service:** Annual Return Filing
   - **Priority:** HIGH
   - **Assign to:** Manager
4. Click **Submit**

#### Step 6: Upload Documents
1. Open the created case
2. Go to **Documents** tab
3. Click **"Upload Document"**
4. Select files and upload
5. Organize in folders
6. Add tags

#### Step 7: Create Compliance Deadline
1. Navigate to **Compliance** (`/compliance`)
2. Click **"Add Deadline"**
3. Fill in:
   - **Type:** MCA_FILING
   - **Form Type:** MGT-7
   - **Title:** MGT-7 Filing for FY 2023-24
   - **Due Date:** 2026-03-31
   - **Reminder Days:** 7, 3, 1
   - **Link to Case:** (Select the case)
4. Click **Save**

#### Step 8: Create and Issue Invoice
1. Go back to the case
2. Navigate to **Invoice** tab
3. Click **"Create Invoice"**
4. Add line items:
   - Annual Return Filing: 1 × ₹15,000 = ₹15,000
   - Government Fees: 1 × ₹500 = ₹500
5. Tax auto-calculated (18% GST)
6. Total: ₹18,290
7. Click **Save** then **Issue Invoice**

---

### Example 2: Client - Viewing and Paying Invoice

#### Step 1: Login as Client
```
URL: http://localhost:3001/login
Email: ceo@techinnovations.com
Password: Client@123
```

#### Step 2: View Dashboard
- See **"1 Pending Invoice"** in stats
- Recent invoices section shows the invoice
- Upcoming deadlines visible

#### Step 3: Navigate to Case
- Click on case from recent cases list
- OR navigate to **Cases** → Click on the case

#### Step 4: View Invoice
- Go to **Invoice** tab
- See invoice with status **"ISSUED"**
- Review invoice details and line items

#### Step 5: Pay Invoice via Razorpay
1. Click **"Pay Now"** button
2. Razorpay modal opens automatically
3. **Payment Details:**
   - Amount: ₹18,290
4. Choose payment method:
   - **Card Payment** (recommended for testing)
   - Net Banking
   - UPI
   - Wallet

#### Step 6: Test Card Details
```
Card Number: 4111 1111 1111 1111
CVV: 123
Expiry: 12/25
Name: Any name
```

#### Step 7: Complete Payment
1. Click **"Pay"**
2. Payment processes
3. Success notification appears
4. Invoice status changes to **"PAID"**
5. Receipt available for download

#### Step 8: Verify Payment
- Dashboard shows **"0 Pending Invoices"**
- Payment reflected in case history
- Notification sent to staff

---

### Example 3: Manager - Managing a Case

#### Step 1: Login as Manager
```
Email: manager@demo.csfirm.local
Password: Employee@123
```

#### Step 2: View Assigned Cases
- Dashboard shows assigned cases
- Click on a case to open

#### Step 3: Update Case Status
1. Open case details
2. Current status: **PENDING**
3. Click **"Start Processing"**
4. Status changes to **PROCESSING**
5. Add progress notes

#### Step 4: Upload Required Documents
1. Go to **Documents** tab
2. Create folder: "Client Documents"
3. Upload files
4. Tag documents appropriately

#### Step 5: Communicate with Client
1. Go to **Chat** tab
2. Send message to client
3. Request additional information if needed

#### Step 6: Move to Review
1. Once work complete, update status
2. Change from **PROCESSING** to **REVIEW**
3. Add completion notes

#### Step 7: Create Invoice (if authorized)
1. Navigate to **Invoice** tab
2. Create invoice
3. Issue to client

---

### Example 4: Employee - Working on Assigned Case

#### Step 1: Login as Employee
```
Email: employee1@demo.csfirm.local
Password: Employee@123
```

#### Step 2: View Assigned Cases
- Navigate to **My Cases** (`/my-cases`)
- See list of assigned cases only

#### Step 3: Open Case
- Click on assigned case
- View case details

#### Step 4: Update Progress
1. Add case notes
2. Upload required documents
3. Update status as authorized

#### Step 5: Check Compliance Deadlines
- View deadlines for this case
- Monitor due dates

#### Step 6: Communicate
- Chat with team members
- Update client if needed

---

## 💳 Razorpay Payment Testing

### Test Credentials

**Test Cards (Always Successful):**
```
Card Number: 4111 1111 1111 1111
CVV: 123
Expiry: Any future date (e.g., 12/25)
Name: Any name
```

**Test Card (Declined):**
```
Card Number: 4000 0000 0000 0002
CVV: 123
Expiry: Any future date
```

**Test UPI ID:**
```
success@razorpay
```

### Payment Flow

1. **Client logs in** → Views invoice
2. **Clicks "Pay Now"** → Razorpay modal opens
3. **Selects payment method** → Enters test details
4. **Completes payment** → Success notification
5. **Invoice marked PAID** → Staff notified
6. **Receipt available** → Downloadable PDF

### Environment Variables
```env
RAZORPAY_KEY_ID=rzp_test_B1yiin6Xj6Y5tY
RAZORPAY_KEY_SECRET=aZFwrM70WnzaNrgGMvlpSmQA
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_B1yiin6Xj6Y5tY
```

---

## 🔄 Case Status Flow (State Machine)

### Normal Flow
```
PENDING (Initial)
    ↓ (Staff starts work)
PROCESSING
    ↓ (Work complete, needs review)
REVIEW
    ↓ (Manager approves)
COMPLETED
```

### Alternative Paths
```
PENDING → REJECTED (Admin rejects)
PROCESSING → ON_HOLD (Waiting for client info)
ON_HOLD → PROCESSING (Info received)
REVIEW → PROCESSING (Revisions needed)
```

### Status Permissions
- **PENDING → PROCESSING:** Employee, Manager, Admin
- **PROCESSING → REVIEW:** Employee, Manager, Admin
- **REVIEW → COMPLETED:** Manager, Admin
- **Any → ON_HOLD:** Manager, Admin
- **Any → REJECTED:** Admin only

---

## 📱 Quick Navigation Reference

### Master Admin URLs
| Page | URL | Purpose |
|------|-----|---------|
| Dashboard | `/dashboard` | Overview and analytics |
| Users | `/users` | Manage staff and clients |
| Services | `/services` | Service templates |
| Organizations | `/organizations` | Client companies |
| Cases | `/cases` | All cases |
| Compliance | `/compliance` | Deadlines tracker |
| Analytics | `/analytics` | Reports and insights |
| Audit | `/audit` | System audit logs |
| Settings | `/settings` | Firm configuration |

### Manager URLs
| Page | URL | Purpose |
|------|-----|---------|
| Dashboard | `/dashboard` | Team overview |
| Cases | `/cases` | Manage cases |
| Organizations | `/organizations` | Client management |
| Compliance | `/compliance` | Deadline tracking |
| Notifications | `/notifications` | System notifications |

### Employee URLs
| Page | URL | Purpose |
|------|-----|---------|
| Dashboard | `/dashboard` | Personal dashboard |
| My Cases | `/my-cases` | Assigned cases only |
| Compliance | `/compliance` | View deadlines |
| Notifications | `/notifications` | Notifications |

### Client URLs
| Page | URL | Purpose |
|------|-----|---------|
| Dashboard | `/dashboard` | Client portal |
| Cases | `/cases` | View cases |
| Compliance | `/compliance` | Compliance tracking |
| Notifications | `/notifications` | Alerts and updates |
| Settings | `/settings` | Profile settings |

---

## 🆘 Troubleshooting

### Cannot Login
- **Check:** Email and password are correct
- **Check:** User exists in database
- **Check:** Backend API is running on port 3000
- **Check:** Frontend is running on port 3001

### Payment Not Working
- **Check:** Razorpay credentials in `.env`
- **Check:** Using test card: 4111 1111 1111 1111
- **Check:** Invoice status is "ISSUED"
- **Check:** Browser allows popups

### Cannot Create Case
- **Check:** User has appropriate role (Manager or Admin)
- **Check:** Organization exists
- **Check:** Service template exists
- **Check:** All required fields filled

### Documents Not Uploading
- **Check:** File size under 10MB
- **Check:** User has permission to upload
- **Check:** Case exists and user has access
- **Check:** Network connection stable

---

## 📞 Support

For issues or questions:
- **Email:** support@csfirm.local
- **GitHub Issues:** https://github.com/Nitinkaroshi/csfirm/issues
- **Documentation:** See `/docs` directory

---

## 📝 Notes

- All dates are in DD/MM/YYYY format
- Currency is INR (₹)
- Timezone is IST (Indian Standard Time)
- File upload limit: 10MB per file
- Session timeout: 15 minutes (auto-refresh)
- Maximum refresh token age: 7 days

---

**Last Updated:** February 11, 2026
**Version:** 1.0.0
**Platform:** CSFIRM - Company Secretary Firm Management
