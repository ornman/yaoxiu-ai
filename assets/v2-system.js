/**
 * 瑶绣 v2.0.0 核心系统
 * 心理学改版 - 盲盒系统 + 等级体系
 */

// ========== 纹样数据库 ==========
const PATTERN_DATABASE = {
  // 日用纹 - 常见纹样
  common: [
    {
      id: 'c1',
      name: '基础八角花',
      rarity: 'common',
      theme: '不完美也是美',
      description: '八角花的八个角，故意绣得不一样。太完美了，绣的是死物；有点歪，才有生气。',
      svg: `<svg viewBox="0 0 100 100"><polygon points="50,5 85,25 95,60 75,90 25,90 5,60 15,25" fill="none" stroke="#9ca3af" stroke-width="2"/></svg>`,
      quote: '你的不完美，是你的纹样。'
    },
    {
      id: 'c2',
      name: '简单回纹',
      rarity: 'common',
      theme: '回家的路',
      description: '不管走多远，总要回来。一圈套一圈，像迷宫，但每圈都在往前。',
      svg: `<svg viewBox="0 0 100 100"><path d="M20,20 h60 v60 h-60 v-40 h40 v20 h-20" fill="none" stroke="#9ca3af" stroke-width="2"/></svg>`,
      quote: '走得再远，根还在那里。'
    },
    {
      id: 'c3',
      name: '山纹',
      rarity: 'common',
      theme: '那座山得自己爬',
      description: '以前瑶家孩子十六岁，要独自进山三天，才算成人。',
      svg: `<svg viewBox="0 0 100 100"><path d="M10,90 L30,40 L50,70 L70,20 L90,90" fill="none" stroke="#9ca3af" stroke-width="2"/></svg>`,
      quote: '每一座山，都是自己的成人礼。'
    },
    {
      id: 'c4',
      name: '水波纹',
      rarity: 'common',
      theme: '时间会抹平',
      description: '水波纹是往前流的，不回头。波纹看起来是圆的，其实每一圈都不一样。',
      svg: `<svg viewBox="0 0 100 100"><path d="M10,30 Q30,20 50,30 T90,30 M10,50 Q30,40 50,50 T90,50 M10,70 Q30,60 50,70 T90,70" fill="none" stroke="#9ca3af" stroke-width="2"/></svg>`,
      quote: '结束了，但流动还在继续。'
    },
    {
      id: 'c5',
      name: '云纹',
      rarity: 'common',
      theme: '看不见的东西',
      description: '云纹很抽象，代表看不见但存在的东西。风、运气、思念。',
      svg: `<svg viewBox="0 0 100 100"><path d="M20,50 Q30,30 50,40 T80,50 Q70,70 50,60 T20,50" fill="none" stroke="#9ca3af" stroke-width="2"/></svg>`,
      quote: '看不见的努力，也值得被记住。'
    }
  ],
  
  // 节庆纹 - 节日专用
  rare: [
    {
      id: 'r1',
      name: '盘瑶八角花',
      rarity: 'rare',
      theme: '支系的骄傲',
      description: '盘瑶支系的独特绣法，八角更细长，像太阳的光芒。',
      svg: `<svg viewBox="0 0 100 100"><polygon points="50,5 90,30 95,70 70,95 30,95 5,70 10,30" fill="none" stroke="#3b82f6" stroke-width="2.5"/></svg>`,
      quote: '每个支系，都有自己的光芒。'
    },
    {
      id: 'r2',
      name: '婚嫁牡丹',
      rarity: 'rare',
      theme: '迟到的绽放',
      description: '绣在嫁衣上的牡丹，故意绣成花骨朵，代表还没开的时候，可能性最多。',
      svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="20" fill="none" stroke="#3b82f6" stroke-width="2"/><circle cx="50" cy="50" r="10" fill="none" stroke="#3b82f6" stroke-width="2"/></svg>`,
      quote: '还没开，也美。'
    },
    {
      id: 'r3',
      name: '丰收稻穗',
      rarity: 'rare',
      theme: '沉甸甸的收获',
      description: '稻穗越饱满，头垂得越低。',
      svg: `<svg viewBox="0 0 100 100"><path d="M50,10 L50,90 M50,30 Q65,35 70,50 M50,40 Q35,45 30,60 M50,50 Q65,55 70,70" fill="none" stroke="#3b82f6" stroke-width="2"/></svg>`,
      quote: '真正的成熟，是学会低头。'
    }
  ],
  
  // 秘传纹 - 支系独有
  epic: [
    {
      id: 'e1',
      name: '蓝靛秘纹',
      rarity: 'epic',
      theme: '深藏的秘密',
      description: '只在蓝靛瑶支系传承的纹样，外族人很少见过。',
      svg: `<svg viewBox="0 0 100 100"><polygon points="50,10 80,30 80,70 50,90 20,70 20,30" fill="none" stroke="#a855f7" stroke-width="3"/><circle cx="50" cy="50" r="15" fill="none" stroke="#a855f7" stroke-width="2"/></svg>`,
      quote: '有些美，只给懂的人看。'
    },
    {
      id: 'e2',
      name: '巫女鸟纹',
      rarity: 'epic',
      theme: '飞翔与停留',
      description: '传说中的巫女才能绣的纹样，鸟的身体是直的，代表还在犹豫要不要飞走。',
      svg: `<svg viewBox="0 0 100 100"><path d="M20,50 Q50,20 80,50 Q50,80 20,50 M50,50 L50,80" fill="none" stroke="#a855f7" stroke-width="3"/></svg>`,
      quote: '飞走还是留下，都是勇敢的选择。'
    }
  ],
  
  // 祖灵纹 - 族群记忆
  legendary: [
    {
      id: 'l1',
      name: '创世图腾',
      rarity: 'legendary',
      theme: '最初的纹样',
      description: '传说瑶族第一位绣娘创造的纹样，已经失传，只在古老的歌谣里听过描述。',
      svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" stroke-width="3"/><circle cx="50" cy="50" r="25" fill="none" stroke="#f59e0b" stroke-width="2"/><circle cx="50" cy="50" r="10" fill="#f59e0b"/></svg>`,
      quote: '传说之所以美丽，是因为没人见过。'
    }
  ]
};

// ========== 等级体系 ==========
const LEVEL_SYSTEM = {
  levels: [
    { level: 1, title: '好奇学徒', icon: '🌱', requirement: { type: 'view', count: 5 }, rewards: ['解锁日用纹'] },
    { level: 2, title: '初级绣娘', icon: '🌿', requirement: { type: 'collect', count: 10 }, rewards: ['解锁节庆纹', '每日抽卡+1'] },
    { level: 3, title: '纹样学徒', icon: '🍃', requirement: { type: 'collect', count: 20 }, rewards: ['解锁秘传纹'] },
    { level: 4, title: '配色助手', icon: '🌸', requirement: { type: 'share', count: 5 }, rewards: ['专属主题'] },
    { level: 5, title: '小瑶师妹', icon: '🌺', requirement: { type: 'streak', count: 7 }, rewards: ['解锁祖灵纹概率'] },
    { level: 6, title: '资深绣娘', icon: '💐', requirement: { type: 'collect', count: 40 }, rewards: ['稀有纹样保底'] },
    { level: 7, title: '纹样专家', icon: '🏵️', requirement: { type: 'collect', count: 50 }, rewards: ['专属称号'] },
    { level: 8, title: '传承大师', icon: '👑', requirement: { type: 'legendary', count: 1 }, rewards: ['全纹样解锁'] }
  ],
  
  getCurrentLevel() {
    return parseInt(localStorage.getItem('yao-level') || '1');
  },
  
  getXP() {
    return parseInt(localStorage.getItem('yao-xp') || '0');
  },
  
  addXP(amount) {
    const currentXP = this.getXP();
    const newXP = currentXP + amount;
    localStorage.setItem('yao-xp', newXP);
    this.checkLevelUp();
    return newXP;
  },
  
  checkLevelUp() {
    const currentLevel = this.getCurrentLevel();
    const nextLevel = this.levels.find(l => l.level === currentLevel + 1);
    
    if (!nextLevel) return false;
    
    const stats = BlindBoxSystem.getStats();
    let shouldLevelUp = false;
    
    switch (nextLevel.requirement.type) {
      case 'view':
        shouldLevelUp = stats.viewCount >= nextLevel.requirement.count;
        break;
      case 'collect':
        shouldLevelUp = stats.totalCollected >= nextLevel.requirement.count;
        break;
      case 'share':
        shouldLevelUp = stats.shareCount >= nextLevel.requirement.count;
        break;
      case 'streak':
        shouldLevelUp = CheckinSystem.getStreak() >= nextLevel.requirement.count;
        break;
      case 'legendary':
        shouldLevelUp = stats.legendaryCount >= nextLevel.requirement.count;
        break;
    }
    
    if (shouldLevelUp) {
      this.levelUp(nextLevel);
      return true;
    }
    return false;
  },
  
  levelUp(newLevel) {
    localStorage.setItem('yao-level', newLevel.level);
    
    // 触发升级动画
    if (window.AnimationManager) {
      AnimationManager.showLevelUp(newLevel);
    }
    
    return newLevel;
  },
  
  getLevelInfo() {
    const currentLevel = this.getCurrentLevel();
    const currentLevelData = this.levels.find(l => l.level === currentLevel);
    const nextLevel = this.levels.find(l => l.level === currentLevel + 1);
    
    return {
      current: currentLevelData,
      next: nextLevel,
      progress: this.getProgress()
    };
  },
  
  getProgress() {
    const currentLevel = this.getCurrentLevel();
    const nextLevel = this.levels.find(l => l.level === currentLevel + 1);
    if (!nextLevel) return 100;
    
    const stats = BlindBoxSystem.getStats();
    let current = 0;
    let target = nextLevel.requirement.count;
    
    switch (nextLevel.requirement.type) {
      case 'view': current = stats.viewCount; break;
      case 'collect': current = stats.totalCollected; break;
      case 'share': current = stats.shareCount; break;
      case 'streak': current = CheckinSystem.getStreak(); break;
      case 'legendary': current = stats.legendaryCount; break;
    }
    
    return Math.min(100, Math.round((current / target) * 100));
  }
};

// ========== 盲盒系统 ==========
const BlindBoxSystem = {
  // 获取今日剩余抽卡次数
  getDailyDraws() {
    const today = new Date().toDateString();
    const lastDrawDate = localStorage.getItem('yao-last-draw-date');
    
    if (lastDrawDate !== today) {
      localStorage.setItem('yao-daily-draws', '0');
      localStorage.setItem('yao-last-draw-date', today);
      return this.getMaxDailyDraws();
    }
    
    const used = parseInt(localStorage.getItem('yao-daily-draws') || '0');
    return this.getMaxDailyDraws() - used;
  },
  
  // 获取最大抽卡次数（随等级增加）
  getMaxDailyDraws() {
    const level = LEVEL_SYSTEM.getCurrentLevel();
    return 3 + Math.floor(level / 2);
  },
  
  // 使用抽卡次数
  useDraw() {
    const remaining = this.getDailyDraws();
    if (remaining <= 0) return false;
    
    const used = this.getMaxDailyDraws() - remaining;
    localStorage.setItem('yao-daily-draws', (used + 1).toString());
    return true;
  },
  
  // 抽卡逻辑
  draw() {
    if (!this.useDraw()) return null;
    
    // 随机抽取
    const rarity = this.randomRarity();
    const pool = PATTERN_DATABASE[rarity];
    const unlocked = this.getUnlockedPatterns();
    
    // 优先给未解锁的
    const available = pool.filter(p => !unlocked.includes(p.id));
    if (available.length === 0) {
      // 都有了，给重复的（转化为经验值）
      const pattern = pool[Math.floor(Math.random() * pool.length)];
      return { ...pattern, duplicate: true, xpReward: 5 };
    }
    
    const pattern = available[Math.floor(Math.random() * available.length)];
    
    // 解锁纹样
    this.unlockPattern(pattern.id);
    
    // 增加经验
    LEVEL_SYSTEM.addXP(10);
    
    return pattern;
  },
  
  // 随机稀有度
  randomRarity() {
    const rand = Math.random();
    const level = LEVEL_SYSTEM.getCurrentLevel();
    
    // 高等级增加稀有概率
    const bonus = (level - 1) * 0.005;
    
    if (rand < 0.01 + bonus) return 'legendary';
    if (rand < 0.1 + bonus) return 'epic';
    if (rand < 0.35 + bonus) return 'rare';
    return 'common';
  },
  
  // 解锁纹样
  unlockPattern(patternId) {
    const unlocked = this.getUnlockedPatterns();
    if (!unlocked.includes(patternId)) {
      unlocked.push(patternId);
      localStorage.setItem('yao-unlocked-patterns', JSON.stringify(unlocked));
    }
  },
  
  // 获取已解锁纹样
  getUnlockedPatterns() {
    const data = localStorage.getItem('yao-unlocked-patterns');
    return data ? JSON.parse(data) : [];
  },
  
  // 获取统计数据
  getStats() {
    const unlocked = this.getUnlockedPatterns();
    const patterns = unlocked.map(id => {
      for (const rarity in PATTERN_DATABASE) {
        const found = PATTERN_DATABASE[rarity].find(p => p.id === id);
        if (found) return found;
      }
      return null;
    }).filter(Boolean);
    
    return {
      totalCollected: unlocked.length,
      commonCount: patterns.filter(p => p.rarity === 'common').length,
      rareCount: patterns.filter(p => p.rarity === 'rare').length,
      epicCount: patterns.filter(p => p.rarity === 'epic').length,
      legendaryCount: patterns.filter(p => p.rarity === 'legendary').length,
      viewCount: parseInt(localStorage.getItem('yao-view-count') || '0'),
      shareCount: parseInt(localStorage.getItem('yao-share-count') || '0')
    };
  },
  
  // 获取所有已解锁纹样详情
  getUnlockedPatternDetails() {
    const unlocked = this.getUnlockedPatterns();
    const details = [];
    
    for (const id of unlocked) {
      for (const rarity in PATTERN_DATABASE) {
        const pattern = PATTERN_DATABASE[rarity].find(p => p.id === id);
        if (pattern) {
          details.push(pattern);
          break;
        }
      }
    }
    
    return details;
  }
};

// ========== 签到系统 ==========
const CheckinSystem = {
  isCheckedToday() {
    const today = new Date().toDateString();
    return localStorage.getItem('yao-last-checkin') === today;
  },
  
  getStreak() {
    return parseInt(localStorage.getItem('yao-checkin-streak') || '0');
  },
  
  checkin() {
    if (this.isCheckedToday()) return { success: false, message: '今日已签到' };
    
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const lastCheckin = localStorage.getItem('yao-last-checkin');
    
    let streak = 1;
    if (lastCheckin === yesterday) {
      streak = this.getStreak() + 1;
    }
    
    localStorage.setItem('yao-last-checkin', today);
    localStorage.setItem('yao-checkin-streak', streak.toString());
    
    // 奖励
    const rewards = this.getRewards(streak);
    
    return { success: true, streak, rewards };
  },
  
  getRewards(streak) {
    const rewards = [{ type: 'draw', value: 1, desc: '+1 抽卡机会' }];
    
    // 里程碑奖励
    if (streak === 3) {
      rewards.push({ type: 'draw', value: 3, desc: '3连抽奖励' });
    } else if (streak === 7) {
      rewards.push({ type: 'rare', value: 1, desc: '稀有纹样 guaranteed' });
    } else if (streak === 30) {
      rewards.push({ type: 'epic', value: 1, desc: '史诗纹样！' });
    }
    
    return rewards;
  }
};

// ========== 绣谱系统（皮肤/头像/背景更换） ==========
const PATTERN_DATA = [
  // 背景纹样
  { id: 'bg-001', name: '瑶山晨雾', rarity: 'common', type: 'background', 
    preview: 'linear-gradient(135deg, #f5f5f0 0%, #e8e4dc 100%)',
    description: '清晨瑶山的薄雾，宁静而神秘' },
  { id: 'bg-002', name: '蓝靛夜色', rarity: 'rare', type: 'background', 
    preview: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    description: '蓝靛瑶传统染色工艺的深邃蓝' },
  { id: 'bg-003', name: '金秋丰收', rarity: 'epic', type: 'background', 
    preview: 'linear-gradient(135deg, #d4a574 0%, #c49a6c 50%, #b8925f 100%)',
    description: '丰收季节的金黄色调' },
  { id: 'bg-004', name: '祖灵祝福', rarity: 'legendary', type: 'background', 
    preview: 'linear-gradient(135deg, #2d1810 0%, #4a2c17 50%, #1a0f0a 100%)',
    description: '祖先图腾的神圣色彩' },
  
  // 头像框纹样
  { id: 'frame-001', name: '八角花边', rarity: 'common', type: 'avatarFrame', 
    preview: '2px solid #9ca3af',
    description: '经典的八角花边框' },
  { id: 'frame-002', name: '盘瑶金框', rarity: 'rare', type: 'avatarFrame', 
    preview: '3px solid #3b82f6',
    description: '盘瑶支系的尊贵边框' },
  { id: 'frame-003', name: '秘传银纹', rarity: 'epic', type: 'avatarFrame', 
    preview: '3px dashed #a855f7',
    description: '只在特定支系传承的神秘边框' },
  { id: 'frame-004', name: '祖灵神环', rarity: 'legendary', type: 'avatarFrame', 
    preview: '4px double #f59e0b',
    description: '传说中只有传承大师才能拥有的神环' },
  
  // 主题纹样
  { id: 'theme-001', name: '素雅白', rarity: 'common', type: 'theme', 
    preview: '#9ca3af',
    accentColor: '#9ca3af',
    description: '朴素典雅的灰色主题' },
  { id: 'theme-002', name: '节庆蓝', rarity: 'rare', type: 'theme', 
    preview: '#3b82f6',
    accentColor: '#3b82f6',
    description: '节日庆典的喜庆蓝色' },
  { id: 'theme-003', name: '秘传紫', rarity: 'epic', type: 'theme', 
    preview: '#a855f7',
    accentColor: '#a855f7',
    description: '神秘高贵的紫色主题' },
  { id: 'theme-004', name: '祖灵金', rarity: 'legendary', type: 'theme', 
    preview: '#f59e0b',
    accentColor: '#f59e0b',
    description: '象征最高荣誉的金色主题' }
];

// 绣谱收藏管理
const PatternCollection = {
  patterns: [], // 获得的纹样ID列表
  applied: { background: null, avatarFrame: null, theme: null },
  
  // 从localStorage初始化
  init() {
    const saved = localStorage.getItem('yao-pattern-collection');
    if (saved) {
      const data = JSON.parse(saved);
      this.patterns = data.patterns || [];
      this.applied = data.applied || { background: null, avatarFrame: null, theme: null };
    }
    // 应用已保存的皮肤设置
    this.applyAll();
  },
  
  // 保存到localStorage
  save() {
    localStorage.setItem('yao-pattern-collection', JSON.stringify({
      patterns: this.patterns,
      applied: this.applied
    }));
  },
  
  // 添加纹样
  addPattern(patternId) {
    if (!this.patterns.includes(patternId)) {
      this.patterns.push(patternId);
      this.save();
      return true;
    }
    return false;
  },
  
  // 应用纹样
  applyPattern(patternId, type) {
    const pattern = PATTERN_DATA.find(p => p.id === patternId);
    if (!pattern || pattern.type !== type) return false;
    
    if (!this.patterns.includes(patternId)) return false;
    
    this.applied[type] = patternId;
    this.save();
    this.applySkin(type, pattern);
    return true;
  },
  
  // 取消应用
  unapplyPattern(type) {
    this.applied[type] = null;
    this.save();
    this.removeSkin(type);
    return true;
  },
  
  // 获取已应用的纹样
  getApplied(type) {
    if (type) {
      return this.applied[type];
    }
    return { ...this.applied };
  },
  
  // 按稀有度获取纹样
  getPatternsByRarity(rarity) {
    return this.getUnlockedPatterns().filter(p => p.rarity === rarity);
  },
  
  // 检查是否已解锁
  isUnlocked(patternId) {
    return this.patterns.includes(patternId);
  },
  
  // 获取所有已解锁纹样详情
  getUnlockedPatterns() {
    return this.patterns.map(id => PATTERN_DATA.find(p => p.id === id)).filter(Boolean);
  },
  
  // 应用皮肤效果
  applySkin(type, pattern) {
    switch (type) {
      case 'background':
        this.applyBackground(pattern);
        break;
      case 'avatarFrame':
        this.applyAvatarFrame(pattern);
        break;
      case 'theme':
        this.applyTheme(pattern);
        break;
    }
  },
  
  // 移除皮肤效果
  removeSkin(type) {
    switch (type) {
      case 'background':
        document.body.style.background = '';
        const chatContainer = document.getElementById('chatContainer');
        if (chatContainer) chatContainer.style.background = '';
        break;
      case 'avatarFrame':
        document.querySelectorAll('.avatar-frame').forEach(el => {
          el.style.border = '';
          el.style.borderRadius = '';
        });
        break;
      case 'theme':
        document.documentElement.style.setProperty('--accent', '');
        document.documentElement.style.setProperty('--accent-light', '');
        break;
    }
  },
  
  // 应用背景
  applyBackground(pattern) {
    document.body.style.background = pattern.preview;
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
      chatContainer.style.background = 'rgba(255, 255, 255, 0.85)';
      chatContainer.style.backdropFilter = 'blur(10px)';
    }
  },
  
  // 应用头像框
  applyAvatarFrame(pattern) {
    // 应用到小瑶头像
    const yaoAvatar = document.querySelector('.yao-avatar, #yaoAvatar');
    if (yaoAvatar) {
      yaoAvatar.style.border = pattern.preview;
      yaoAvatar.style.borderRadius = '50%';
      yaoAvatar.classList.add('avatar-frame');
    }
    // 应用到用户头像
    const userAvatars = document.querySelectorAll('.user-avatar, .avatar');
    userAvatars.forEach(avatar => {
      avatar.style.border = pattern.preview;
      avatar.style.borderRadius = '50%';
      avatar.classList.add('avatar-frame');
    });
  },
  
  // 应用主题
  applyTheme(pattern) {
    if (pattern.accentColor) {
      document.documentElement.style.setProperty('--accent', pattern.accentColor);
      document.documentElement.style.setProperty('--accent-light', pattern.accentColor + '40');
    }
  },
  
  // 应用所有已保存的设置
  applyAll() {
    ['background', 'avatarFrame', 'theme'].forEach(type => {
      const patternId = this.applied[type];
      if (patternId) {
        const pattern = PATTERN_DATA.find(p => p.id === patternId);
        if (pattern) {
          this.applySkin(type, pattern);
        }
      }
    });
  }
};

// 导出
window.V2System = {
  patterns: PATTERN_DATABASE,
  level: LEVEL_SYSTEM,
  blindBox: BlindBoxSystem,
  checkin: CheckinSystem,
  patternCollection: PatternCollection,
  PATTERN_DATA
};
