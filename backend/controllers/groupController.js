// backend/controllers/groupController.js

const pool = require('../config/db');

// POST /groups - create a new group
const createGroup = async (req, res) => {
  const client = await pool.connect();  // get a dedicated client for the transaction

  try {
    const { name } = req.body;
    const userId = req.user.userId;  // from JWT middleware

    // 1. Validate
    if (!name || name.trim().length < 3) {
      return res.status(400).json({ error: 'Group name must be at least 3 characters' });
    }

    // 2. Start transaction
    await client.query('BEGIN');

    // 3. Insert into groups table
    const groupResult = await client.query(
      'INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING *',
      [name.trim(), userId]
    );

    const newGroup = groupResult.rows[0];

    // 4. Add the creator as a member
    await client.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
      [newGroup.id, userId]
    );

    // 5. Commit transaction
    await client.query('COMMIT');

    // 6. Respond
    res.status(201).json({
      message: 'Group created successfully',
      group: newGroup,
    });

  } catch (err) {
    // If anything fails, undo all changes
    await client.query('ROLLBACK');
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    // Always release the client back to the pool
    client.release();
  }
};

// GET /groups - get all groups for the logged-in user
const getMyGroups = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT g.id, g.name, g.created_by, g.created_at
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = $1
       ORDER BY g.created_at DESC`,
      [userId]
    );

    res.status(200).json({
      groups: result.rows,
      count: result.rows.length,
    });
    } catch (err) {
        console.error('Get groups error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /groups/:id - get one group with its members
const getGroupById = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.userId;

    // 1. Check if user is a member of this group
    const memberCheck = await pool.query( 
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    // 2. Get group details
    const groupResult = await pool.query(
      'SELECT * FROM groups WHERE id = $1',
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // 3. Get all members of this group
    const membersResult = await pool.query(
      `SELECT u.id, u.name, u.email, gm.joined_at
       FROM users u
       JOIN group_members gm ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.joined_at ASC`,
      [groupId]
    );

    // 4. Respond
    res.status(200).json({
      group: groupResult.rows[0],
      members: membersResult.rows,
    });

  } catch (err) {
    console.error('Get group by id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
// POST /groups/:id/members - add a member by email
const addMember = async (req, res) => {
  try {
    const groupId = req.params.id;
    const requesterId = req.user.userId;
    const { email } = req.body;

    // 1. Validate input
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // 2. Check requester is a member of this group
    const memberCheck = await pool.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, requesterId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    // 3. Find the user to add by email
    const userResult = await pool.query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'No user found with that email' });
    }

    const userToAdd = userResult.rows[0];

    // 4. Check if user is already a member
    const existingMember = await pool.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userToAdd.id]
    );

    if (existingMember.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    // 5. Add the user to the group
    await pool.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
      [groupId, userToAdd.id]
    );

    // 6. Respond with the added user info
    res.status(201).json({
      message: 'Member added successfully',
      member: userToAdd,
    });

  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Don't forget to export
module.exports = { createGroup, getMyGroups, getGroupById, addMember };