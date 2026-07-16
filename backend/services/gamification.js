const User = require('../models/User');
const PointsLog = require('../models/PointsLog');
const FootprintLog = require('../models/FootprintLog');
const Leaderboard = require('../models/Leaderboard');

const ACTION_POINTS = {
  daily_tracking: 10,
  bill_upload: 50,
  challenge_claim: 100,
  coach_usage: 20
};

const BADGE_THRESHOLDS = [
  { name: 'Eco Warrior', points: 100 },
  { name: 'Green Hero', points: 500 },
  { name: 'Carbon Crusher', points: 1000 },
  { name: 'Net Zero Champion', points: 2500 }
];

const POINTS_PER_LEVEL = 200;

const getWeekStart = () => {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const weekStart = new Date(now.setUTCDate(diff));
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart;
};

const getMonthStart = () => {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return monthStart;
};

const awardPoints = async (userId, action, customPoints) => {
  const points = customPoints !== undefined ? customPoints : (ACTION_POINTS[action] || 0);
  if (points === 0) {
    console.warn(`Attempted to award points for unrecognized action: ${action}`);
    return { awarded: 0, total_points: 0, badges_unlocked: [] };
  }

  // 1. Log transaction
  const log = new PointsLog({
    user_id: userId,
    reason: action,
    points,
    timestamp: new Date()
  });
  await log.save();

  // 2. Update user
  const user = await User.findById(userId);
  if (!user) {
    console.error(`User ${userId} not found when awarding points.`);
    return { awarded: points, total_points: points, badges_unlocked: [] };
  }

  const currentPoints = user.points || 0;
  const currentBadges = user.badges || [];
  const newPoints = currentPoints + points;
  const newBadges = [...currentBadges];
  const unlockedNewBadges = [];

  for (const badgeDef of BADGE_THRESHOLDS) {
    if (newPoints >= badgeDef.points && !newBadges.includes(badgeDef.name)) {
      newBadges.push(badgeDef.name);
      unlockedNewBadges.push(badgeDef.name);
    }
  }

  // Streak calculations
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!user.last_activity_date) {
    user.streak_current = 1;
    user.streak_longest = 1;
  } else {
    const lastAct = new Date(user.last_activity_date);
    lastAct.setHours(0, 0, 0, 0);
    
    // Difference in calendar days
    const diffTime = today.getTime() - lastAct.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      user.streak_current = (user.streak_current || 0) + 1;
      if (user.streak_current > (user.streak_longest || 0)) {
        user.streak_longest = user.streak_current;
      }
    } else if (diffDays > 1) {
      user.streak_current = 1;
    }
    // If diffDays === 0, keep current streak
  }
  user.last_activity_date = new Date();

  user.points = newPoints;
  user.badges = newBadges;
  await user.save();

  // Sync to leaderboard
  try {
    await syncUserToLeaderboard(userId);
  } catch (err) {
    console.error(`Failed to sync user leaderboard stats: ${err.message}`);
  }

  return {
    awarded: points,
    total_points: newPoints,
    badges_unlocked: unlockedNewBadges,
    all_badges: newBadges
  };
};

const getLevelName = (level, badges) => {
  return badges.length > 0 ? badges[badges.length - 1] : `Level ${level} Eco-Pioneer`;
};

const getLeaderboardLevelName = (points, badges) => {
  const levelNum = Math.floor(points / POINTS_PER_LEVEL) + 1;
  return getLevelName(levelNum, badges);
};

const getUserStats = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    return {
      points: 0,
      weekly_points: 0,
      monthly_points: 0,
      level: 1,
      xp_in_level: 0,
      badges: []
    };
  }

  const globalPoints = user.points || 0;
  const badges = user.badges || [];
  const level = Math.floor(globalPoints / POINTS_PER_LEVEL) + 1;
  const xp_in_level = globalPoints % POINTS_PER_LEVEL;

  const weekStart = getWeekStart();
  const monthStart = getMonthStart();

  const weeklyLogs = await PointsLog.find({
    user_id: userId,
    timestamp: { $gte: weekStart }
  });
  const weeklyPoints = weeklyLogs.reduce((sum, log) => sum + (log.points || 0), 0);

  const monthlyLogs = await PointsLog.find({
    user_id: userId,
    timestamp: { $gte: monthStart }
  });
  const monthlyPoints = monthlyLogs.reduce((sum, log) => sum + (log.points || 0), 0);

  return {
    points: globalPoints,
    weekly_points: weeklyPoints,
    monthly_points: monthlyPoints,
    level,
    xp_in_level,
    badges,
    streak_current: user.streak_current || 0,
    streak_longest: user.streak_longest || 0,
    last_activity_date: user.last_activity_date
  };
};

const syncUserToLeaderboard = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return;

  const startOfMonth = getMonthStart();
  const logs = await FootprintLog.find({
    user_id: userId,
    date: { $gte: startOfMonth }
  });
  const monthlyCo2 = logs.reduce((sum, log) => sum + (log.total_co2_kg || 0), 0);

  const globalPoints = user.points || 0;
  const badges = user.badges || [];
  const levelName = getLeaderboardLevelName(globalPoints, badges);

  await Leaderboard.findOneAndUpdate(
    { user_id: userId },
    {
      username: user.full_name || 'EcoPilot User',
      level_name: levelName,
      points: globalPoints,
      monthly_co2_kg: parseFloat(monthlyCo2.toFixed(2)),
      updated_at: new Date()
    },
    { upsert: true, returnDocument: 'after' }
  );
};

const getLeaderboard = async (period, currentUserId) => {
  let entries = await Leaderboard.find({});

  if (entries.length === 0) {
    const allUsers = await User.find({});
    for (const u of allUsers) {
      try {
        await syncUserToLeaderboard(u._id);
      } catch (err) {
        console.error(`Failed to sync user ${u._id}: ${err.message}`);
      }
    }
    entries = await Leaderboard.find({});
  }

  let leaderboardData = [];

  if (period === 'monthly') {
    entries.sort((a, b) => (a.monthly_co2_kg || 0) - (b.monthly_co2_kg || 0));
    leaderboardData = entries.map((entry, idx) => ({
      rank: idx + 1,
      user_id: entry.user_id.toString(),
      name: entry.username || 'EcoPilot User',
      level: entry.level_name || 'Eco-Pioneer',
      points: entry.points || 0,
      monthly_co2_kg: entry.monthly_co2_kg || 0.0,
      isMe: currentUserId ? entry.user_id.toString() === currentUserId.toString() : false
    }));
  } else if (period === 'weekly') {
    const weekStart = getWeekStart();
    const periodLogs = await PointsLog.find({ timestamp: { $gte: weekStart } });
    
    const userPointsMap = {};
    for (const log of periodLogs) {
      const uidStr = log.user_id.toString();
      userPointsMap[uidStr] = (userPointsMap[uidStr] || 0) + (log.points || 0);
    }

    entries.sort((a, b) => (userPointsMap[b.user_id.toString()] || 0) - (userPointsMap[a.user_id.toString()] || 0));

    leaderboardData = entries.map((entry, idx) => {
      const uidStr = entry.user_id.toString();
      return {
        rank: idx + 1,
        user_id: uidStr,
        name: entry.username || 'EcoPilot User',
        level: entry.level_name || 'Eco-Pioneer',
        points: userPointsMap[uidStr] || 0,
        monthly_co2_kg: entry.monthly_co2_kg || 0.0,
        isMe: currentUserId ? uidStr === currentUserId.toString() : false
      };
    });
  } else { // global
    entries.sort((a, b) => (b.points || 0) - (a.points || 0));
    leaderboardData = entries.map((entry, idx) => ({
      rank: idx + 1,
      user_id: entry.user_id.toString(),
      name: entry.username || 'EcoPilot User',
      level: entry.level_name || 'Eco-Pioneer',
      points: entry.points || 0,
      monthly_co2_kg: entry.monthly_co2_kg || 0.0,
      isMe: currentUserId ? entry.user_id.toString() === currentUserId.toString() : false
    }));
  }

  if (leaderboardData.length === 0) {
    leaderboardData = [
      { rank: 1, user_id: 'dummy_1', name: 'Marcus Aurelius', level: 'Carbon Neutral Hero', points: 180, isMe: false, monthly_co2_kg: 10.5 },
      { rank: 2, user_id: 'dummy_2', name: 'Clara Schumann', level: 'Eco Warrior', points: 120, isMe: false, monthly_co2_kg: 15.2 },
      { rank: 3, user_id: 'dummy_3', name: 'Ada Lovelace', level: 'Eco Warrior', points: 90, isMe: false, monthly_co2_kg: 20.0 }
    ];
  }

  return leaderboardData;
};

module.exports = {
  awardPoints,
  getUserStats,
  syncUserToLeaderboard,
  getLeaderboard,
  POINTS_PER_LEVEL
};
