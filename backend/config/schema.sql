CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- user's table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    avatar VARCHAR(20), -- e.g. "hero-7" - an index into the frontend's HeroAvatar set, chosen at signup
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- group's table
CREATE TABLE groups(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    icon VARCHAR(10), -- a single emoji chosen at group creation
    color_theme VARCHAR(20) DEFAULT 'teal', -- one of frontend's GROUP_THEMES ids
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

-- groupMembers table
CREATE TABLE group_members(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,-- if delete groups id then groupmembers row of that id is also deleted
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id) -- same user cannot be added to the same group multiple times
);

-- bills table
CREATE TABLE bills(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    added_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL, -- the cover photo (first scanned part) - used for list/gallery thumbnails
    total_amount DECIMAL(10,2) NOT NULL ,-- what added_by actually fronted: sum(bill_items.price) + sum(bill_extra_charges.amount) + (tip_amount, only if tip_paid_by is null i.e. shared) - this is what item_contributors + bill_charges shares must sum back to
    tip_amount DECIMAL(10,2) NOT NULL DEFAULT 0, -- 0 when the receipt has no tip line. Split equally among contributors like bill_extra_charges UNLESS tip_paid_by is set - tip is the one charge type that can be personally covered instead of shared, so it isn't folded into bill_extra_charges
    tip_paid_by UUID REFERENCES users(id) ON DELETE SET NULL, -- non-null only when one specific member covered the tip themselves (not shared) - that amount is then excluded from total_amount/bill_charges entirely, since nobody owes it back
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE, -- when the purchase actually happened, distinct from created_at (when it was scanned/added) - collected from the user via AddBillPage's date-of-purchase prompt
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- bill_images table: every photo scanned into a bill - a long receipt is
-- often split across several photos (see AddBillPage's "Scan another part"),
-- so a bill can have more than one. bills.image_url duplicates position 0
-- here so existing list-view thumbnails don't need a join.
CREATE TABLE bill_images(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- bill_items table
CREATE TABLE bill_items(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    unit_note VARCHAR(255), -- e.g. "0.075 kg @ $6.57/kg", scanned from a weighted receipt line
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- items_contributors table
CREATE TABLE item_contributors(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES bill_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    share_amount DECIMAL(10,2) NOT NULL,
    UNIQUE(item_id, user_id) -- same user cannot be added to the same item multiple times
);

-- bill_extra_charges table: named bill-level charges that aren't purchasable
-- items - tax, a venue fee, a surcharge (see receiptParser.js's
-- CHARGE_LABEL_PATTERN, which auto-detects these from the scanned receipt
-- text instead of letting them get parsed as regular items). Always split
-- equally across the bill's contributors (see bill_charges) - unlike a tip,
-- there's no "one person covered it" option for these.
CREATE TABLE bill_extra_charges(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- bill_charges table: each contributor's equal share of
-- sum(bill_extra_charges.amount) + shared tip_amount (see
-- bills.tip_paid_by) - kept separate from item_contributors so that
-- table's share_amount stays a pure item-price split; this is the
-- bill-level equivalent for charges that aren't tied to any one item.
CREATE TABLE bill_charges(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    UNIQUE(bill_id, user_id)
);

-- settelement table
CREATE TABLE settlements(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    paid_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paid_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);