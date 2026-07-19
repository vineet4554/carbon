const Challenge = require('../models/Challenge');
const { awardPoints, getUserStats, getLeaderboard } = require('../services/gamification');

const getStats = async (req, res) => {
  try {
    const stats = await getUserStats(req.user._id);
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const getLeaderboardRoute = async (req, res) => {
  try {
    const period = req.query.period || 'global';
    if (!['weekly', 'monthly', 'global'].includes(period)) {
      return res.status(400).json({ detail: "Period must be 'weekly', 'monthly', or 'global'." });
    }

    const leaderboard = await getLeaderboard(period, req.user._id);
    res.json(leaderboard);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const getChallenges = async (req, res) => {
  try {
    const userId = req.user._id;
    let challenges = await Challenge.find({ user_id: userId });

    if (challenges.length === 0) {
      const defaultQuests = [
        {
          user_id: userId,
          quest_title: 'Meatless Commute',
          description: 'Eat vegetarian or vegan meals for 3 consecutive days.',
          xp_yield: 120,
          goal_amount: 3,
          current_amount: 2,
          category: 'food',
          status: 'in_progress',
          updated_at: new Date()
        },
        {
          user_id: userId,
          quest_title: 'Transit Traveler',
          description: 'Swap driving single commutes for rail or bus travel.',
          xp_yield: 150,
          goal_amount: 1,
          current_amount: 0,
          category: 'transport',
          status: 'in_progress',
          updated_at: new Date()
        },
        {
          user_id: userId,
          quest_title: 'Standby Shutdown',
          description: 'Audit and unplug 5 idle phantom electrical loads.',
          xp_yield: 60,
          goal_amount: 5,
          current_amount: 5,
          category: 'energy',
          status: 'completed',
          updated_at: new Date()
        },
        {
          user_id: userId,
          quest_title: 'Refuse Restraint',
          description: 'Keep household waste below 5kg this week.',
          xp_yield: 80,
          goal_amount: 1,
          current_amount: 1,
          category: 'waste',
          status: 'completed',
          updated_at: new Date()
        }
      ];

      challenges = await Challenge.insertMany(defaultQuests);
    }

    const formatted = challenges.map(ch => {
      let statusVal = ch.status || 'in_progress';
      if (statusVal === 'in_progress' && (ch.current_amount || 0) >= (ch.goal_amount || 1)) {
        statusVal = 'completed';
      }

      return {
        id: ch._id.toString(),
        user_id: ch.user_id.toString(),
        quest_title: ch.quest_title || '',
        description: ch.description || '',
        xp_yield: ch.xp_yield || 50,
        goal_amount: ch.goal_amount || 1,
        current_amount: ch.current_amount || 0,
        category: ch.category || 'food',
        status: statusVal,
        updated_at: ch.updated_at ? ch.updated_at.toISOString() : new Date().toISOString()
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Get challenges error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

const claimChallenge = async (req, res) => {
  try {
    const userId = req.user._id;
    const { challenge_id } = req.params;

    const challenge = await Challenge.findById(challenge_id);
    if (!challenge || challenge.user_id.toString() !== userId.toString()) {
      return res.status(404).json({ detail: 'Challenge not found.' });
    }

    let statusVal = challenge.status || 'in_progress';
    const currentAmt = challenge.current_amount || 0;
    const goalAmt = challenge.goal_amount || 1;

    if (statusVal === 'claimed') {
      return res.status(400).json({ detail: 'Challenge reward already claimed.' });
    }

    if (statusVal === 'in_progress' && currentAmt < goalAmt) {
      return res.status(400).json({ detail: 'Challenge not yet completed.' });
    }

    challenge.status = 'claimed';
    challenge.updated_at = new Date();
    await challenge.save();

    const awardRes = await awardPoints(userId, 'challenge_claim', challenge.xp_yield);

    res.json({
      message: 'Challenge reward claimed successfully!',
      awarded: awardRes.awarded,
      total_points: awardRes.total_points,
      badges_unlocked: awardRes.badges_unlocked
    });
  } catch (error) {
    console.error('Claim challenge error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

module.exports = {
  getStats,
  getLeaderboardRoute,
  getChallenges,
  claimChallenge
};
