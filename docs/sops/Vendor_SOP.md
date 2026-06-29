<div style="font-family: 'Georgia', serif; color: #1a1a2e; max-width: 900px; margin: 0 auto; padding: 40px;">

<div style="text-align: center; padding: 60px 40px; background: linear-gradient(135deg, #7B1C3E 0%, #3d0e1f 100%); color: white; border-radius: 8px; margin-bottom: 50px;">

# ATTENDA — VENDOR / PARTNER SOP

<p style="font-size: 1.1rem; letter-spacing: 0.2em; color: #f0c0d0; margin: 10px 0;">STANDARD OPERATING PROCEDURES · VERSION 2.0</p>
<p style="color: #e0a0b5;">Role: Restaurant / Transport / Service Partner</p>
<p style="font-size: 0.85rem; color: #c49aaa;">Quantum Hospitality Solutions · Confidential · June 2026</p>

</div>

## QUICK REFERENCE

| Task | Where | Time |
|------|-------|------|
| Log in to Vendor Portal | attendaapp.com/vendor | 15 sec |
| Accept a new order | Order Board — New column | 10 sec |
| Update order to Preparing | Order Board card | 5 sec |
| Mark order Ready | Order Board card | 5 sec |
| Mark order Delivered | Order Board card | 5 sec |
| Add a menu item | Menu tab | 2 min |
| Edit a menu item | Menu tab | 1 min |
| View daily order manifest | Manifest tab | 30 sec |

---

# <span style="color: #7B1C3E;">SOP-VD-01 — LOGGING IN TO THE VENDOR PORTAL</span>

---

**URL:** `attendaapp.com/vendor`

**Steps:**

1. Open a browser on any device and go to `attendaapp.com/vendor`.
2. Enter the **email address** and **password** provided by the hotel.
3. Click **Sign In**.
4. The Order Board loads — you are now in your Vendor Portal.

> **First time logging in?** The hotel admin sent your credentials via email. If you did not receive them or cannot log in, contact the hotel's front desk or admin.

> **Your login only shows YOUR orders.** The Vendor Portal is scoped to your business only — you will not see orders for other vendors.

---

# <span style="color: #7B1C3E;">SOP-VD-02 — MANAGING INCOMING ORDERS</span>

---

**Purpose:** Receive, acknowledge, and fulfill orders placed by hotel guests.

**Access:** Order Board (main screen after login)

### Understanding the Order Board

The Order Board is a Kanban view with four columns:

```
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
│    NEW    │  │ RECEIVED  │  │PREPARING  │  │   READY   │
│           │  │           │  │           │  │           │
│ [Order]   │  │ [Order]   │  │ [Order]   │  │ [Order]   │
└───────────┘  └───────────┘  └───────────┘  └───────────┘
```

New orders appear in the **NEW** column. A sound notification plays when a new order arrives (allow notifications in your browser when prompted).

### Order Card Contents

Each order card shows:
- Order number and time placed
- Guest name and room number
- Items ordered with quantities
- Special instructions (if any)
- Total amount
- Payment method (Card or Room Charge)

### Processing an Order — Step by Step

**Step 1: Accept the Order**
1. Find the order in the **NEW** column.
2. Click **Accept Order** on the card.
3. The card moves to **RECEIVED**.

> Do this as soon as you see the order. The guest can track status in real time — a fast acceptance builds trust.

**Step 2: Begin Preparation**
1. Start preparing the order.
2. Click **Start Preparing** on the card.
3. The card moves to **PREPARING**.

**Step 3: Mark as Ready**
1. When the order is packaged and ready for pickup/delivery:
2. Click **Mark Ready** on the card.
3. The card moves to **READY**.
4. The hotel staff and guest are notified that the order is ready.

**Step 4: Mark as Delivered**
1. When the order has been delivered to the guest:
2. Click **Mark Delivered** on the card.
3. The card moves to the **Delivered** column (completed orders).

### Status Quick Reference

| Button | From → To | Meaning |
|--------|----------|---------|
| Accept Order | New → Received | You've seen and accepted the order |
| Start Preparing | Received → Preparing | Kitchen/prep is actively working on it |
| Mark Ready | Preparing → Ready | Order is ready; notify hotel for delivery |
| Mark Delivered | Ready → Delivered | Order reached the guest |

> **Real-time:** Every status change updates the guest's order tracking page (`/track`) instantly. Keep status current.

---

# <span style="color: #7B1C3E;">SOP-VD-03 — ORDER MANIFEST</span>

---

**Purpose:** Review a flat list of all today's orders for reconciliation or prep planning.

**Access:** Manifest tab (top navigation in Vendor Portal)

**Steps:**

1. Click the **Manifest** tab.
2. Today's orders appear in a list sorted by time.
3. Filter by:
   - **Status:** All / Active / Completed
   - **Time:** Last hour / Today
4. Use this view to verify all orders were fulfilled at end of day.

---

# <span style="color: #7B1C3E;">SOP-VD-04 — MANAGING YOUR MENU</span>

---

**Purpose:** Add, edit, and manage the menu items visible to hotel guests.

**Access:** Menu tab (top navigation in Vendor Portal)

### Adding a New Menu Item

1. Click the **Menu** tab.
2. Click **+ Add Item**.
3. Fill in:

| Field | Description |
|-------|-------------|
| Item Name | The dish or product name |
| Description | Short description (ingredients, style) |
| Price | Price in dollars (e.g., 14.99) |
| Category | Appetizer / Main / Dessert / Drink / Other |
| Photo | Upload a high-quality photo (JPEG or PNG, min 800px wide) |
| Active | Toggle ON to make it visible to guests |

4. Click **Save** — the item appears immediately in the guest ordering app.

### Editing a Menu Item

1. In the **Menu** tab, click the item you want to edit.
2. An edit drawer opens with all current values.
3. Modify any field.
4. Click **Save** — changes are live immediately.

### Temporarily Hiding an Item (86'd)

If an item is unavailable (sold out, seasonal):

1. Click the item in the Menu tab.
2. Toggle **Active** to OFF.
3. Click **Save** — the item disappears from the guest app immediately.
4. Re-enable it the same way when it becomes available again.

### Deleting a Menu Item

1. Open the item in the edit drawer.
2. Click **Delete Item** (red button at the bottom).
3. Confirm deletion — this is permanent.

> **Tip:** Instead of deleting items you might bring back, toggle Active to OFF. This preserves the item for future reactivation.

---

# <span style="color: #7B1C3E;">SOP-VD-05 — APPLYING AS A NEW PARTNER</span>

---

*This SOP is for businesses that have not yet been onboarded. If you are already active in the Vendor Portal, skip this section.*

**Purpose:** Submit an application to become an Attenda partner for a hotel.

**URL:** `attendaapp.com/apply?hotel={hotel-slug}`

*(The hotel should provide you with their specific apply link.)*

### Applying

1. Visit the apply link provided by the hotel.
2. Fill in the application form:

| Field | Description |
|-------|-------------|
| Business Name | Your restaurant or business name |
| Contact Name | Your name (primary contact) |
| Phone | Best phone number to reach you |
| Email | Email for login credentials (if approved) |
| Business Type | Restaurant / Transport / Service / Experience |
| Description | Brief description of what you offer |

3. Click **Submit Application**.
4. You will see a confirmation: *"Application received! We'll be in touch within 24 hours."*

**After submission:**
- The hotel admin reviews your application in their staff dashboard.
- If approved, you will receive an email with your Vendor Portal login credentials.
- If more information is needed, the hotel admin will contact you at the email you provided.

---

*ATTENDA · Confidential · Do Not Distribute · Vendor SOP v2.0 · June 2026*

</div>
